package com.peekle.domain.game.service;

import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 게임 대기방(Waiting Room) 관련 Redis 작업을 담당하는 서비스
 * - 방 입장/퇴장
 * - 준비 상태 토글
 * - 팀 변경
 * - 유저 강퇴
 * - 연결 해제 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameWaitService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final UserRepository userRepository;
    private final WorkbookRepository workbookRepository;
    private final RedisGameRoomManager roomManager;

    /**
     * 게임 방 입장
     * 
     * @param roomId   방 ID
     * @param userId   유저 ID
     * @param password 비밀번호 (선택)
     */
    public void enterGameRoom(Long roomId, Long userId, String password) {
        // 1. 방 정보 조회 (존재 여부만 확인)
        Map<Object, Object> roomInfo = getRoomInfo(roomId);

        // 2. 재접속 시도 (성공 시 리턴)
        if (tryRejoin(roomId, userId, roomInfo)) {
            return;
        }

        // 3. 신규 입장 검증 (상태, 비밀번호)
        validateNewEntry(roomId, password, roomInfo);

        // 4. 신규 입장 처리 (맴버 추가)
        addUserToRoom(roomId, userId);

        // 5. 팀 배정 (팀전인 경우)
        String teamType = (String) roomInfo.getOrDefault("teamType", "INDIVIDUAL");
        if ("TEAM".equals(teamType)) {
            handleTeamEntry(roomId, userId);
        }

        // 6. ENTER 이벤트 발행
        publishEnterEvent(roomId, userId, roomInfo);

        // 7. 유저 상태 업데이트
        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.USER_CURRENT_GAME, userId),
                String.valueOf(roomId));

        // 8. 로비 브로드캐스트
        broadcastToLobby(roomId, userId, roomInfo);
    }

    private Map<Object, Object> getRoomInfo(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

        if (roomInfo.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 방입니다.");
        }
        return roomInfo;
    }

    private void validateNewEntry(Long roomId, String password, Map<Object, Object> roomInfo) {
        // 방 상태 확인
        String status = (String) redisTemplate.opsForValue().get(String.format(RedisKeyConst.GAME_STATUS, roomId));
        if (status != null && !"WAITING".equals(status)) {
            throw new IllegalStateException("이미 시작되었거나 종료된 방에는 입장할 수 없습니다.");
        }

        // 비밀번호 체크
        if (roomInfo.containsKey("password")) {
            String roomPassword = (String) roomInfo.get("password");
            if (password == null || !password.equals(roomPassword)) {
                throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
            }
        }
    }

    private boolean tryRejoin(Long roomId, Long userId, Map<Object, Object> roomInfo) {
        String userCurrentGameKey = String.format(RedisKeyConst.USER_CURRENT_GAME, userId);
        Object currentGameIdObj = redisTemplate.opsForValue().get(userCurrentGameKey);

        if (currentGameIdObj != null) {
            String currentGameId = String.valueOf(currentGameIdObj);
            // 이미 이 방에 참여 중인 경우
            if (currentGameId.equals(String.valueOf(roomId))) {
                ensureTeamAssignment(roomId, userId, roomInfo);
                publishEnterEvent(roomId, userId, roomInfo);
                return true;
            }
            // 다른 방 ID를 가지고 있지만 실제 Players Set에는 이 방에 있는 경우 (State 불일치 복구)
            String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
            if (redisTemplate.opsForSet().isMember(playersKey, String.valueOf(userId))) {
                redisTemplate.opsForValue().set(userCurrentGameKey, String.valueOf(roomId));
                ensureTeamAssignment(roomId, userId, roomInfo);
                publishEnterEvent(roomId, userId, roomInfo);
                return true;
            }
            throw new IllegalStateException("이미 다른 게임에 참여 중입니다. (Game ID: " + currentGameId + ")");
        }

        // USER_CURRENT_GAME 키가 없더라도 Players Set에 있다면 재접속
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        boolean isRejoining = redisTemplate.opsForSet().isMember(playersKey, String.valueOf(userId));

        if (isRejoining) {
            redisTemplate.opsForValue().set(userCurrentGameKey, String.valueOf(roomId));
            log.info("User {} rejoined game room {}.", userId, roomId);
            ensureTeamAssignment(roomId, userId, roomInfo);
            publishEnterEvent(roomId, userId, roomInfo);
            return true;
        }

        return false;
    }

    private void ensureTeamAssignment(Long roomId, Long userId, Map<Object, Object> roomInfo) {
        String teamType = (String) roomInfo.getOrDefault("teamType", "INDIVIDUAL");
        if ("TEAM".equals(teamType)) {
            // handleTeamEntry 내부에서 이미 팀이 있으면 pass, 없으면 배정함
            handleTeamEntry(roomId, userId);
        }
    }

    private void addUserToRoom(Long roomId, Long userId) {
        redisTemplate.opsForSet().add(String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId), String.valueOf(userId));
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(userId), "false");
    }

    private void handleTeamEntry(Long roomId, Long userId) {
        String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);

        // 이미 팀이 배정되어 있는지 확인 (재접속 시 팀 유지)
        Object existingTeam = redisTemplate.opsForHash().get(teamsKey, String.valueOf(userId));
        if (existingTeam != null) {
            log.info("User {} already assigned to Team {} in Room {} (Rejoin)", userId, existingTeam, roomId);
            return;
        }

        Map<Object, Object> teams = redisTemplate.opsForHash().entries(teamsKey);

        long redCount = teams.values().stream().filter("RED"::equals).count();
        long blueCount = teams.values().stream().filter("BLUE"::equals).count();

        // 인원이 적은 팀으로 배정 (동점이면 RED)
        String assignedTeam = (redCount <= blueCount) ? "RED" : "BLUE";

        redisTemplate.opsForHash().put(teamsKey, String.valueOf(userId), assignedTeam);
        log.info("User {} assigned to Team {} in Room {}", userId, assignedTeam, roomId);
    }

    private void broadcastToLobby(Long roomId, Long userId, Map<Object, Object> roomInfo) {
        String broadcastKey = String.format(RedisKeyConst.GAME_ROOM_BROADCASTED, roomId);
        String hostIdStr = (String) roomInfo.get("hostId");

        // 방장 최초 입장 시 로비 브로드캐스트
        if (Boolean.FALSE.equals(redisTemplate.hasKey(broadcastKey))) {
            if (hostIdStr != null && hostIdStr.equals(String.valueOf(userId))) {
                broadcastRoomCreation(roomId, userId, roomInfo);
                redisTemplate.opsForValue().set(broadcastKey, "true");
                log.info("📢 [Lobby] Game Room {} Broadcasted via enterGameRoom (Host Connected)", roomId);
            }
        }

        // 플레이어 수 업데이트 브로드캐스트
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        Long currentPlayers = redisTemplate.opsForSet().size(playersKey);

        Map<String, Object> lobbyPlayerData = new HashMap<>();
        lobbyPlayerData.put("roomId", roomId);
        lobbyPlayerData.put("currentPlayers", currentPlayers != null ? currentPlayers.intValue() : 0);
        redisPublisher.publish(
                new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                SocketResponse.of("LOBBY_PLAYER_UPDATE", lobbyPlayerData));
        log.info("📢 [Lobby] Player joined Room {} - Current players: {}", roomId, currentPlayers);
    }

    private void broadcastRoomCreation(Long roomId, Long userId, Map<Object, Object> roomInfo) {
        Map<String, Object> lobbyCreateData = new HashMap<>();
        lobbyCreateData.put("roomId", roomId);
        lobbyCreateData.put("title", (String) roomInfo.get("title"));
        lobbyCreateData.put("mode", (String) roomInfo.get("mode"));
        lobbyCreateData.put("teamType", (String) roomInfo.get("teamType"));
        lobbyCreateData.put("maxPlayers", Integer.parseInt((String) roomInfo.getOrDefault("maxPlayers", "4")));
        lobbyCreateData.put("currentPlayers", 1);
        lobbyCreateData.put("status", GameStatus.WAITING.name());

        String roomPwd = (String) roomInfo.get("password");
        lobbyCreateData.put("isSecret", roomPwd != null && !roomPwd.isBlank());

        // Host Info
        Map<String, Object> hostInfo = new HashMap<>();
        hostInfo.put("id", userId);
        String hNickname = (String) roomInfo.get("hostNickname");
        String hProfile = (String) roomInfo.get("hostProfileImg");

        if (hNickname == null) {
            User hUser = userRepository.findById(userId).orElse(null);
            if (hUser != null) {
                hNickname = hUser.getNickname();
                hProfile = hUser.getProfileImg();
            }
        }
        hostInfo.put("nickname", hNickname != null ? hNickname : "Unknown");
        hostInfo.put("profileImg", hProfile != null ? hProfile : "");
        lobbyCreateData.put("host", hostInfo);

        String tLimit = (String) roomInfo.get("timeLimit");
        lobbyCreateData.put("timeLimit", tLimit != null ? Integer.parseInt(tLimit) : 0);

        String pCount = (String) roomInfo.get("problemCount");
        lobbyCreateData.put("problemCount", pCount != null ? Integer.parseInt(pCount) : 0);

        lobbyCreateData.put("tierMin", roomInfo.getOrDefault("tierMin", "Bronze 5"));
        lobbyCreateData.put("tierMax", roomInfo.getOrDefault("tierMax", "Gold 1"));

        // Tags
        String tagsStr = (String) roomInfo.get("tags");
        if (tagsStr != null && !tagsStr.isEmpty()) {
            List<String> tagsList = Arrays.asList(tagsStr.split(","));
            lobbyCreateData.put("tags", roomManager.translateTagsToKo(tagsList));
        } else {
            lobbyCreateData.put("tags", Collections.emptyList());
        }

        // Workbook Title
        String selWbId = (String) roomInfo.get("selectedWorkbookId");
        if (selWbId != null) {
            try {
                Long wbId = selWbId.startsWith("wb") ? Long.parseLong(selWbId.replace("wb", ""))
                        : Long.parseLong(selWbId);
                String wbTitle = workbookRepository.findById(wbId).map(Workbook::getTitle).orElse(null);
                lobbyCreateData.put("workbookTitle", wbTitle);

                String previewKey = String.format(RedisKeyConst.GAME_PROBLEMS_PREVIEW, roomId);
                List<Object> pList = redisTemplate.opsForList().range(previewKey, 0, -1);
                List<Map<String, Object>> problems = new ArrayList<>();

                if (pList != null) {
                    for (Object item : pList) {
                        if (item instanceof Map) {
                            Map<String, String> pInfo = (Map<String, String>) item;
                            problems.add(Map.of(
                                    "id", Long.parseLong(pInfo.get("id")),
                                    "externalId", pInfo.get("externalId"),
                                    "title", pInfo.get("title"),
                                    "tier", pInfo.get("tier"),
                                    "url", pInfo.get("url")));
                        }
                    }
                    lobbyCreateData.put("problems", problems);
                }

            } catch (Exception e) {
                log.error("Failed to add workbook info to lobby broadcast", e);
            }
        }

        redisPublisher.publish(
                new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                SocketResponse.of("LOBBY_ROOM_CREATED", lobbyCreateData));
    }

    /**
     * 팀 변경
     */
    public void changeTeam(Long roomId, Long userId, String teamColor) {
        String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
        Map<Object, Object> teams = redisTemplate.opsForHash().entries(teamsKey);

        long teamCount = teams.values().stream().filter(teamColor::equals).count();
        if (teamCount >= 4) {
            throw new IllegalStateException(teamColor + "팀은 이미 가득 찼습니다.");
        }

        redisTemplate.opsForHash().put(teamsKey, String.valueOf(userId), teamColor);

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("team", teamColor);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("TEAM", data));
    }

    /**
     * 소켓 연결 끊김 처리
     */
    public void handleDisconnect(Long roomId, Long userId) {
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String status = (String) redisTemplate.opsForValue().get(statusKey);

        if ("WAITING".equals(status)) {
            log.info("🚪 User {} disconnected from lobby (WAITING). Exiting immediately.", userId);
            exitGameRoom(roomId, userId);
            return;
        }

        if ("PLAYING".equals(status) || "END".equals(status)) {
            log.info("🔌 User {} disconnected during game ({}). Allowing reconnection.", userId, status);
            return;
        }

        log.warn("⚠️ User {} disconnected from unknown/invalid state: {}. Exiting for safety.", userId, status);
        exitGameRoom(roomId, userId);
    }

    /**
     * 방 퇴장
     */
    public void exitGameRoom(Long roomId, Long userId) {
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String status = (String) redisTemplate.opsForValue().get(statusKey);

        // Backup check: If status is null but start time exists, treat as PLAYING
        if (status == null) {
            String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, roomId);
            if (Boolean.TRUE.equals(redisTemplate.hasKey(startTimeKey))) {
                status = "PLAYING";
                log.info("⚠️ Status was null but GAME_START_TIME exists. Treating Room {} as PLAYING.", roomId);
            }
        }

        if ("PLAYING".equals(status) || "END".equals(status)) {
            log.info("User {} temporarily left game room {} ({}). Allowing reconnection.", userId, roomId, status);
            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
            // User might be null if already deleted, so try/catch or optional
            userRepository.findById(userId).ifPresent(user -> {
                Map<String, Object> leaveData = Map.of(
                        "userId", userId,
                        "nickname", user.getNickname());
                redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("LEAVE", leaveData));
            });
            return;
        }

        log.info("User {} exiting game room {} (status: {}). Removing from Redis.", userId, roomId, status);

        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        redisTemplate.opsForSet().remove(playersKey, String.valueOf(userId));

        redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, userId));

        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(userId));
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId), String.valueOf(userId));

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> leaveData = Map.of(
                "userId", userId,
                "nickname", user.getNickname());
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("LEAVE", leaveData));

        Long remainingCount = redisTemplate.opsForSet().size(playersKey);

        if (remainingCount != null && remainingCount == 0) {
            log.info("🗑️ Game Room {} is empty. Deleting immediately.", roomId);
            roomManager.deleteGameRoom(roomId);
        } else {
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");

            if (hostIdStr != null && hostIdStr.equals(String.valueOf(userId))) {
                Set<Object> members = redisTemplate.opsForSet().members(playersKey);
                if (members != null && !members.isEmpty()) {
                    Object newHostIdObj = members.iterator().next();
                    String newHostId = String.valueOf(newHostIdObj);

                    redisTemplate.opsForHash().put(infoKey, "hostId", newHostId);

                    User newHost = userRepository.findById(Long.valueOf(newHostId))
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));

                    redisTemplate.opsForHash().put(infoKey, "hostNickname", newHost.getNickname());
                    redisTemplate.opsForHash().put(infoKey, "hostProfileImg",
                            newHost.getProfileImg() != null ? newHost.getProfileImg() : "");
                    Map<String, Object> hostChangeData = Map.of(
                            "newHostId", newHostId,
                            "newHostNickname", newHost.getNickname());
                    redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("HOST_CHANGE", hostChangeData));
                    log.info("Game Room {} Host Changed: {} -> {}", roomId, userId, newHostId);

                    Map<String, Object> lobbyHostData = new HashMap<>();
                    lobbyHostData.put("roomId", roomId);
                    lobbyHostData.put("hostNickname", newHost.getNickname());
                    redisPublisher.publish(
                            new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                            SocketResponse.of("LOBBY_HOST_UPDATE", lobbyHostData));
                    log.info("📢 [Lobby] Host changed for Room {} -> {}", roomId, newHost.getNickname());
                }
            }

            Map<String, Object> lobbyPlayerData = new HashMap<>();
            lobbyPlayerData.put("roomId", roomId);
            lobbyPlayerData.put("currentPlayers", remainingCount != null ? remainingCount.intValue() : 0);
            redisPublisher.publish(
                    new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                    SocketResponse.of("LOBBY_PLAYER_UPDATE", lobbyPlayerData));
            log.info("📢 [Lobby] Player left Room {} - Current players: {}", roomId, remainingCount);
        }
    }

    /**
     * 게임 포기 (Forfeit)
     */
    public void forfeitGameRoom(Long roomId, Long userId) {
        log.info("User {} forfeited game room {}. Removing from Redis completely.", userId, roomId);

        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        redisTemplate.opsForSet().remove(playersKey, String.valueOf(userId));

        redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, userId));

        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(userId));
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId), String.valueOf(userId));

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> forfeitData = Map.of(
                "userId", userId,
                "nickname", user.getNickname());
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("FORFEIT", forfeitData));

        Long remainingCount = redisTemplate.opsForSet().size(playersKey);

        if (remainingCount != null && remainingCount == 0) {
            log.info("🗑️ Game Room {} is empty after forfeit. Deleting immediately.", roomId);
            roomManager.deleteGameRoom(roomId);
        } else {
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");

            if (hostIdStr != null && hostIdStr.equals(String.valueOf(userId))) {
                Set<Object> members = redisTemplate.opsForSet().members(playersKey);
                if (members != null && !members.isEmpty()) {
                    Object newHostIdObj = members.iterator().next();
                    String newHostId = String.valueOf(newHostIdObj);

                    redisTemplate.opsForHash().put(infoKey, "hostId", newHostId);

                    User newHost = userRepository.findById(Long.valueOf(newHostId))
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));

                    redisTemplate.opsForHash().put(infoKey, "hostNickname", newHost.getNickname());
                    redisTemplate.opsForHash().put(infoKey, "hostProfileImg",
                            newHost.getProfileImg() != null ? newHost.getProfileImg() : "");
                    Map<String, Object> hostChangeData = Map.of(
                            "newHostId", newHostId,
                            "newHostNickname", newHost.getNickname());
                    redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("HOST_CHANGE", hostChangeData));
                    log.info("Game Room {} Host Changed after forfeit: {} -> {}", roomId, userId, newHostId);

                    Map<String, Object> lobbyHostData = new HashMap<>();
                    lobbyHostData.put("roomId", roomId);
                    lobbyHostData.put("hostNickname", newHost.getNickname());
                    redisPublisher.publish(
                            new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                            SocketResponse.of("LOBBY_HOST_UPDATE", lobbyHostData));
                    log.info("📢 [Lobby] Host changed for Room {} -> {}", roomId, newHost.getNickname());
                }
            }

            Map<String, Object> lobbyPlayerData = new HashMap<>();
            lobbyPlayerData.put("roomId", roomId);
            lobbyPlayerData.put("currentPlayers", remainingCount != null ? remainingCount.intValue() : 0);
            redisPublisher.publish(
                    new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                    SocketResponse.of("LOBBY_PLAYER_UPDATE", lobbyPlayerData));
            log.info("📢 [Lobby] Player forfeited Room {} - Current players: {}", roomId, remainingCount);
        }
    }

    /**
     * 준비 토글
     */
    public void toggleReady(Long roomId, Long userId) {
        String key = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        String currentStr = (String) redisTemplate.opsForHash().get(key, String.valueOf(userId));
        boolean current = "true".equals(currentStr);
        boolean next = !current;

        redisTemplate.opsForHash().put(key, String.valueOf(userId), String.valueOf(next));

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("isReady", next);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("READY", data));
    }

    /**
     * 유저 강퇴 (방장만 가능)
     */
    public void kickUser(Long roomId, Long userId, Long targetUserId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");
        if (hostIdStr == null || !hostIdStr.equals(String.valueOf(userId))) {
            throw new IllegalStateException("방장만 유저를 강퇴할 수 있습니다.");
        }
        if (userId.equals(targetUserId)) {
            throw new IllegalStateException("자기 자신을 강퇴할 수 없습니다.");
        }

        log.info("User {} (Host) kicking user {} from game room {}", userId, targetUserId, roomId);

        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        redisTemplate.opsForSet().remove(playersKey, String.valueOf(targetUserId));

        redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, targetUserId));

        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(targetUserId));
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId),
                String.valueOf(targetUserId));

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        User kickedUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> kickData = Map.of(
                "userId", targetUserId,
                "nickname", kickedUser.getNickname(),
                "message", "방장에 의해 강퇴되었습니다.");
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("KICK", kickData));

        Long remainingCount = redisTemplate.opsForSet().size(playersKey);

        Map<String, Object> lobbyPlayerData = new HashMap<>();
        lobbyPlayerData.put("roomId", roomId);
        lobbyPlayerData.put("currentPlayers", remainingCount != null ? remainingCount.intValue() : 0);
        redisPublisher.publish(
                new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                SocketResponse.of("LOBBY_PLAYER_UPDATE", lobbyPlayerData));
        log.info("📢 [Lobby] Player kicked from Room {} - Current players: {}", roomId, remainingCount);
    }

    private void publishEnterEvent(Long roomId, Long userId, Map<Object, Object> roomInfo) {
        // ENTER 이벤트 발행 (전체 참여자 정보 포함)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Team 정보 조회 (팀전인 경우)
        String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
        String assignedTeam = (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(userId));

        // Ready 상태 조회
        String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        String readyStatus = (String) redisTemplate.opsForHash().get(readyKey, String.valueOf(userId));
        boolean isReady = "true".equals(readyStatus);

        // 방장 여부 확인
        String hostIdStr = (String) roomInfo.get("hostId");
        boolean isHost = hostIdStr != null && hostIdStr.equals(String.valueOf(userId));

        Map<String, Object> enterData = new HashMap<>();
        enterData.put("userId", userId);
        enterData.put("nickname", user.getNickname());
        enterData.put("profileImg", user.getProfileImg() != null ? user.getProfileImg() : "");
        enterData.put("host", isHost);
        enterData.put("ready", isReady);
        if (assignedTeam != null) {
            enterData.put("team", assignedTeam);
        }

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("ENTER", enterData));
    }
}
