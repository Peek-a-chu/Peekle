package com.peekle.domain.game.service;

import com.peekle.domain.game.dto.request.GameChatRequest;
import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final RedissonClient redissonClient;
    private final GameService gameService;

    /**
     * 게임 상태 변경 메서드
     * 분산 락(Redisson Lock)을 사용하여 상태 변경 시 동시성 문제를 방지합니다.
     * 예를 들어, 동시에 '게임 시작'과 '방 나가기' 등의 요청이 몰려도 순서대로 처리되도록 보장합니다.
     *
     * @param roomId     게임 방 ID
     * @param nextStatus 변경할 다음 상태
     */
    public void updateGameStatus(Long roomId, GameStatus nextStatus) {
        // 1. 락 키 생성: 방 단위로 잠금을 걸기 위해 키에 roomId를 포함합니다.
        String lockKey = String.format(RedisKeyConst.LOCK_GAME_STATUS, roomId);
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // 2. 락 획득 시도 (tryLock)
            // waitTime(2초): 락을 얻을 때까지 최대 2초간 대기합니다.
            // leaseTime(3초): 락을 얻은 후 3초가 지나면 자동으로 해제됩니다 (Deadlock 방지).
            if (!lock.tryLock(2, 3, TimeUnit.SECONDS)) {
                throw new IllegalStateException("현재 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.");
            }

            // 3. 현재 상태 조회
            String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
            String currentStatusStr = (String) redisTemplate.opsForValue().get(statusKey);

            // 상태가 Redis에 없으면 방금 생성된 방으로 간주하고 WAITING(대기) 상태로 초기화
            GameStatus currentStatus = currentStatusStr == null ? GameStatus.WAITING
                    : GameStatus.valueOf(currentStatusStr);

            // 4. 상태 전이 유효성 검사 (State Machine 로직)
            // 예: 게임 중(PLAYING)인데 갑자기 대기(WAITING)로 갈 수 없음.
            validateStatusTransition(currentStatus, nextStatus);

            // 5. 상태 업데이트 (Redis에 저장)
            redisTemplate.opsForValue().set(statusKey, nextStatus.name());
            log.info("Game Room {} Status Changed: {} -> {}", roomId, currentStatus, nextStatus);

            // 6. 변경 사항 전파 (Pub/Sub)
            // 클라이언트(프론트엔드)는 이 토픽을 구독하고 있다가, 메시지가 오면 화면을 갱신합니다.
            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
            redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("STATUS_CHANGE", nextStatus));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Lock interrupted", e);
        } finally {
            // 7. 락 해제
            // 반드시 finally 블록에서 해제해야 예외가 발생해도 락이 풀립니다.
            // isHeldByCurrentThread: 내가 건 락인지 확인하고 해제합니다.
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 상태 전이 검증 로직 (State Machine)
     * 허용되지 않는 상태 변경 흐름을 차단합니다.
     * 올바른 흐름: 대기 -> 카운트다운 -> 게임중 -> 종료
     */
    private void validateStatusTransition(GameStatus current, GameStatus next) {
        // 같은 상태로 변경 요청은 무시하고 통과시킴 (멱등성 보장)
        if (current == next)
            return;

        boolean isValid = switch (current) {
            // 대기(WAITING)에서는 -> 카운트다운(시작) 혹은 종료(방폭)만 가능
            case WAITING -> next == GameStatus.PLAYING || next == GameStatus.END;

            // 게임 중(PLAYING)에는 -> 오직 종료(END)만 가능
            case PLAYING -> next == GameStatus.END;

            // 이미 종료(END)된 게임은 -> 상태 변경 불가
            case END -> false;
        };

        if (!isValid) {
            throw new IllegalStateException(String.format("잘못된 상태 변경 요청입니다: %s -> %s", current, next));
        }
    }

    // 방 만들기
    public Long createGameRoom(GameCreateRequest request, Long hostId) {
        // 1. 방 ID 생성 (Atomic Increment)
        Long roomId = redisTemplate.opsForValue().increment(RedisKeyConst.GAME_ROOM_ID_SEQ);
        // 2. 방 정보 Hash에 저장
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<String, String> roomInfo = new HashMap<>();
        roomInfo.put("title", request.getTitle());
        roomInfo.put("maxPlayers", String.valueOf(request.getMaxPlayers()));
        roomInfo.put("timeLimit", String.valueOf(request.getTimeLimit()));
        roomInfo.put("problemCount", String.valueOf(request.getProblemCount()));

        // Field Mapping
        roomInfo.put("teamType", request.getTeamType().name());
        roomInfo.put("mode", request.getMode().name());
        roomInfo.put("hostId", String.valueOf(hostId));

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            roomInfo.put("password", request.getPassword());
        }

        // 추가 옵션 저장
        if (request.getProblemSource() != null)
            roomInfo.put("problemSource", request.getProblemSource());
        if (request.getTierMin() != null)
            roomInfo.put("tierMin", request.getTierMin());
        if (request.getTierMax() != null)
            roomInfo.put("tierMax", request.getTierMax());
        if (request.getSelectedWorkbookId() != null)
            roomInfo.put("selectedWorkbookId", request.getSelectedWorkbookId());

        // 초기 상태 WAITING
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.GAME_STATUS, roomId), GameStatus.WAITING.name());
        redisTemplate.opsForHash().putAll(infoKey, roomInfo);

        // 3. 방 목록(Set)에 ID 추가 (검색용)
        redisTemplate.opsForSet().add(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));

        // 4. 방정 참여 처리 & Ready (Host는 자동 Ready)
        enterGameRoom(roomId, hostId, request.getPassword());
        toggleReady(roomId, hostId); // true

        return roomId;
    }

    // 방 입장
    public void enterGameRoom(Long roomId, Long userId, String password) {
        // 0-1. 중복 참여 방지: 이미 다른 게임에 참여 중인지 확인
        String userCurrentGameKey = String.format(RedisKeyConst.USER_CURRENT_GAME, userId);
        Object currentGameId = redisTemplate.opsForValue().get(userCurrentGameKey);
        if (currentGameId != null) {
            throw new IllegalStateException("이미 다른 게임에 참여 중입니다. (Game ID: " + currentGameId + ")");
        }

        // 0-2. 방 존재 및 비밀번호 확인
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

        if (roomInfo.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 방입니다.");
        }

        // 비밀번호 체크
        if (roomInfo.containsKey("password")) {
            String roomPassword = (String) roomInfo.get("password");
            if (password == null || !password.equals(roomPassword)) {
                throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
            }
        }

        // Players Set 추가
        redisTemplate.opsForSet().add(String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId), String.valueOf(userId));
        // Ready 상태 초기화 (false)
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(userId), "false");

        // ENTER 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("ENTER", userId));

        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.USER_CURRENT_GAME, userId),
                String.valueOf(roomId));
    }

    // 팀 변경
    public void changeTeam(Long roomId, Long userId, String teamColor) {
        // Red / Blue 유효성 검사 (필요시)

        // 팀 정보 저장
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId),
                String.valueOf(userId), teamColor);

        // TEAM_CHANGE 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("team", teamColor);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("TEAM_CHANGE", data));
    }

    // 방 퇴장
    public void exitGameRoom(Long roomId, Long userId) {
        // 1. 참여자 목록(Set)에서 제거
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        redisTemplate.opsForSet().remove(playersKey, String.valueOf(userId));

        // 유저의 현재 게임 정보 삭제
        redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, userId));

        // 2. 부가 정보 제거 (Ready, Team)
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId),
                String.valueOf(userId));
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId), String.valueOf(userId));

        // 3. LEAVE 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("LEAVE", userId));

        // 4. 남은 인원 확인
        Long remainingCount = redisTemplate.opsForSet().size(playersKey);

        if (remainingCount != null && remainingCount == 0) {
            // A. 남은 사람이 없으면 -> 방 삭제 (Clean Up)
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INFO, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_STATUS, roomId));
            redisTemplate.delete(playersKey); // Players Set
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId)); // Ready Hash
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId)); // Teams Hash
            redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));
            log.info("Game Room {} Deleted (No participants)", roomId);
        } else {
            // B. 남은 사람이 있으면 -> 방장 위임 체크
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");

            // 나간 사람이 방장이라면?
            if (hostIdStr != null && hostIdStr.equals(String.valueOf(userId))) {
                // 남은 사람 중 아무나 한 명 선택 (Set이라 순서 랜덤)
                // pop()은 꺼내버리므로, members()로 조회 후 하나 픽하거나, pop 후 다시 add
                // 여기서는 간단하게 members() -> iterator().next() 사용
                Set<Object> members = redisTemplate.opsForSet().members(playersKey);
                if (members != null && !members.isEmpty()) {
                    Object newHostIdObj = members.iterator().next();
                    String newHostId = String.valueOf(newHostIdObj);

                    // 방 정보에 새로운 방장 업데이트
                    redisTemplate.opsForHash().put(infoKey, "hostId", newHostId);

                    // HOST_CHANGE 이벤트 발행 (아이콘 변경용)
                    redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("HOST_CHANGE", newHostId));
                    log.info("Game Room {} Host Changed: {} -> {}", roomId, userId, newHostId);
                }
            }
        }
    }

    // 준비 토글
    public void toggleReady(Long roomId, Long userId) {
        String key = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        String currentStr = (String) redisTemplate.opsForHash().get(key, String.valueOf(userId));
        boolean current = "true".equals(currentStr);
        boolean next = !current;

        redisTemplate.opsForHash().put(key, String.valueOf(userId), String.valueOf(next));

        // READY 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("isReady", next);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("READY", data));
    }

    // 게임 시작
    public void startGame(Long roomId, Long userId) {
        // 1. 방장 검증
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");
        if (hostIdStr == null || !hostIdStr.equals(String.valueOf(userId))) {
            throw new IllegalStateException("방장만 게임을 시작할 수 있습니다.");
        }

        // 방장이 시작을 눌렀다는 건 방장은 준비가 된 것임 (Auto Ready)
        String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        redisTemplate.opsForHash().put(readyKey, String.valueOf(userId), "true");

        // 2. 참여자 전원 Ready 검증
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        Set<Object> players = redisTemplate.opsForSet().members(playersKey);

        // 모든 플레이어가 Ready인지 확인
        if (players != null) {
            for (Object player : players) {
                String isReady = (String) redisTemplate.opsForHash().get(readyKey, player);
                if (!"true".equals(isReady)) {
                    throw new IllegalStateException("모든 플레이어가 준비해야 시작할 수 있습니다.");
                }
            }
        }

        // 게임 시작 시간 저장 (점수 계산용)
        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.GAME_START_TIME, roomId),
                String.valueOf(System.currentTimeMillis()));

        // 3. 상태 변경
        updateGameStatus(roomId, GameStatus.PLAYING);

        // STAR 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("START", roomId));
    }

    // 채팅 보내기
    public void sendChatMessage(GameChatRequest request, Long userId) {
        String topic;

        // Scope에 따른 토픽 분기
        if ("TEAM".equals(request.getScope())) {
            topic = String.format(RedisKeyConst.TOPIC_GAME_CHAT_TEAM,
                    request.getGameId(), request.getTeamColor());
        } else {
            // GLOBAL (기본값)
            topic = String.format(RedisKeyConst.TOPIC_GAME_CHAT_GLOBAL, request.getGameId());
        }

        // 데이터 패킹
        Map<String, Object> chatData = new HashMap<>();
        chatData.put("userId", userId);
        chatData.put("message", request.getMessage());
        chatData.put("teamColor", request.getTeamColor());

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("CHAT", chatData));
    }

    // 코드 저장
    public void updateCode(com.peekle.domain.game.dto.request.GameCodeRequest request, Long userId) {
        String key = String.format(RedisKeyConst.GAME_CODE_KEY, request.getGameId(), request.getProblemId(), userId);
        redisTemplate.opsForValue().set(key, request.getCode());
    }

    // 코드 불러오기
    public void loadCode(com.peekle.domain.game.dto.request.GameCodeRequest request, Long userId) {
        String key = String.format(RedisKeyConst.GAME_CODE_KEY, request.getGameId(), request.getProblemId(), userId);
        String code = (String) redisTemplate.opsForValue().get(key);

        // 개인 채널로 전송 (/topic/games/code/load/{userId})
        String topic = String.format(RedisKeyConst.TOPIC_GAME_CODE_LOAD, userId);
        Map<String, Object> response = new HashMap<>();
        response.put("problemId", request.getProblemId());
        response.put("language", request.getLanguage());
        response.put("code", code); // code가 null이면 null 전송 (프론트에서 처리)

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("CODE_LOAD", response));
    }

    // 강퇴하기
    public void kickParticipant(Long gameId, Long hostId, Long targetUserId) {
        // 1. 방장 권한 확인
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String realHostId = (String) redisTemplate.opsForHash().get(infoKey, "hostId");
        if (realHostId == null || !realHostId.equals(String.valueOf(hostId))) {
            throw new IllegalStateException("방장만 강퇴할 수 있습니다.");
        }

        // 2. 강퇴 대상 퇴장 처리 (기존 exit 로직 재사용)
        exitGameRoom(gameId, targetUserId);

        // 3. KICK 이벤트 발행 (클라이언트가 이를 받고 목록 갱신 + 알림)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, gameId);
        Map<String, Object> kickData = new HashMap<>();
        kickData.put("userId", targetUserId);
        kickData.put("message", "방장에 의해 강퇴되었습니다.");
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("KICK", kickData));
    }

    // 방 목록 조회
    public List<GameRoomResponse> getAllGameRooms() {
        // 1. 모든 방 ID 조회

        Set<Object> roomIds = redisTemplate.opsForSet().members(RedisKeyConst.GAME_ROOM_IDS);
        if (roomIds == null || roomIds.isEmpty())
            return Collections.emptyList();
        // 2. 각 방의 정보 조회 (Pipelining 권장하지만 여기선 심플하게 Loop)
        return roomIds.stream().map(id -> {
            Long roomId = Long.parseLong((String) id);
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            Map<Object, Object> info = redisTemplate.opsForHash().entries(infoKey);
            String status = (String) redisTemplate.opsForValue().get(String.format(RedisKeyConst.GAME_STATUS, roomId));
            return GameRoomResponse.builder()
                    .roomId(roomId)
                    .title((String) info.get("title"))
                    .isSecret(info.containsKey("password"))
                    .status(status != null ? GameStatus.valueOf(status) : GameStatus.WAITING)
                    .maxPlayers(Integer.parseInt((String) info.getOrDefault("maxPlayers", "4")))
                    .problemCount(Integer.parseInt((String) info.getOrDefault("problemCount", "10")))
                    .teamType(GameType.valueOf((String) info.getOrDefault("type", "INDIVIDUAL")))
                    .mode(GameMode.valueOf((String) info.getOrDefault("mode", "TIME_ATTACK")))
                    .build();
        }).collect(Collectors.toList());
    }

    // 방 단건 조회 (초대 링크, 새로고침 용)
    public GameRoomResponse getGameRoom(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> info = redisTemplate.opsForHash().entries(infoKey);

        // 방이 없으면 예외 처리
        if (info.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 방입니다. (Room ID: " + roomId + ")");
        }

        String status = (String) redisTemplate.opsForValue().get(String.format(RedisKeyConst.GAME_STATUS, roomId));

        return GameRoomResponse.builder()
                .roomId(roomId)
                .title((String) info.get("title"))
                .isSecret(info.containsKey("password"))
                .status(status != null ? GameStatus.valueOf(status) : GameStatus.WAITING)
                .maxPlayers(Integer.parseInt((String) info.getOrDefault("maxPlayers", "4")))
                .problemCount(Integer.parseInt((String) info.getOrDefault("problemCount", "10")))
                .teamType(GameType.valueOf((String) info.getOrDefault("type", "INDIVIDUAL")))
                .mode(GameMode.valueOf((String) info.getOrDefault("mode", "TIME_ATTACK")))
                .build();
    }
    // 문제 해결 (SubmissionService에서 호출)
    public void solveProblem(Long userId, Long gameId, Long problemId) {

        // 1. 이미 푼 문제인지 체크 (중복 방지)
        String solvedKey = String.format(RedisKeyConst.GAME_SOLVED_PROBLEM, gameId, problemId);
        Boolean isAlreadySolved = redisTemplate.opsForSet().isMember(solvedKey, String.valueOf(userId));

        if (Boolean.TRUE.equals(isAlreadySolved)) {
            return; // 이미 풀었음
        }

        // 2. 해결 처리 (Set에 추가)
        redisTemplate.opsForSet().add(solvedKey, String.valueOf(userId));

        // 3. 경과 시간 계산
        String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, gameId);
        String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);

        long startTime = (startTimeStr != null) ? Long.parseLong(startTimeStr) : System.currentTimeMillis();
        long elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000;

        // 4. 개인 기록 업데이트 (Hash: solvedCount, totalTime)
        String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, userId);
        redisTemplate.opsForHash().increment(scoreKey, "solvedCount", 1);
        redisTemplate.opsForHash().increment(scoreKey, "totalTime", elapsedSeconds);

        // 5. 랭킹 점수 계산 & 업데이트 (ZSet)
        // 공식: (푼 문제 수 * 5000) - 경과 시간
        Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
        int solvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 1;

        double score = (solvedCount * 5000) - elapsedSeconds;

        // 팀전 여부 확인 및 팀 점수 반영
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String teamTypeStr = (String) redisTemplate.opsForHash().get(infoKey, "teamType");
        String teamColor = null;

        if ("TEAM".equals(teamTypeStr)) {
            // 유저의 팀 정보 조회
            String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, gameId);
            teamColor = (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(userId));

            if (teamColor != null) {
                // 팀 점수 증가 (RED/BLUE) -> ZSet 사용 (Score: Solved Count)
                String teamRankingKey = String.format(RedisKeyConst.GAME_TEAM_RANKING, gameId);
                redisTemplate.opsForZSet().incrementScore(teamRankingKey, teamColor, 1);
            }
        }

        // 개인 랭킹도 항상 업데이트 (MVP/ACE 산정용)
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, gameId);
        redisTemplate.opsForZSet().add(rankingKey, String.valueOf(userId), score);

        // 6. 이벤트 발행 (누가 풀었니?)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_SOLVED, gameId);
        Map<String, Object> solvedData = new HashMap<>();
        solvedData.put("userId", userId);
        solvedData.put("problemId", problemId);
        solvedData.put("teamColor", teamColor);
        solvedData.put("score", score);
        solvedData.put("solvedCount", solvedCount);

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("SOLVED", solvedData));

        // 7. 랭킹 이벤트 발행 (실시간 랭킹 업데이트용)
        String rankingTopic = String.format(RedisKeyConst.TOPIC_GAME_RANKING, gameId);
        Map<String, Object> rankingData = new HashMap<>();
        rankingData.put("userId", userId);
        rankingData.put("score", score);
        rankingData.put("solvedCount", solvedCount);
        rankingData.put("teamColor", teamColor);

        redisPublisher.publish(new ChannelTopic(rankingTopic), SocketResponse.of("RANKING_UPDATE", rankingData));

        // 8. 스피드 레이스 종료 조건 체크
        String modeStr = (String) redisTemplate.opsForHash().get(infoKey, "mode");
        if ("SPEED_RACE".equals(modeStr)) {
            checkSpeedRaceEndCondition(gameId, teamColor, teamTypeStr);
        }
    }

    /**
     * 스피드 레이스 종료 조건 체크
     * - 개인전: 모든 유저가 모든 문제를 풀었을 때
     * - 팀전: 한 팀이 모든 문제를 풀었을 때
     */
    private void checkSpeedRaceEndCondition(Long gameId, String solverTeam, String teamType) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String problemCountStr = (String) redisTemplate.opsForHash().get(infoKey, "problemCount");
        int problemCount = (problemCountStr != null) ? Integer.parseInt(problemCountStr) : 10;

        if ("TEAM".equals(teamType) && solverTeam != null) {
            // 팀전: 해당 팀의 점수(푼 문제 수)가 problemCount 이상인지 확인
            String teamRankingKey = String.format(RedisKeyConst.GAME_TEAM_RANKING, gameId);
            Double teamScore = redisTemplate.opsForZSet().score(teamRankingKey, solverTeam);
            if (teamScore != null && teamScore >= problemCount) {
                log.info("🏆 Team {} completed all {} problems! Finishing game...", solverTeam, problemCount);
                finishGame(gameId);
            }
        } else {
            // 개인전: 모든 유저가 모든 문제를 풀었는지 확인
            String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, gameId);
            Set<Object> players = redisTemplate.opsForSet().members(playersKey);
            if (players == null || players.isEmpty())
                return;

            boolean allCompleted = true;
            for (Object playerObj : players) {
                Long playerId = Long.parseLong(String.valueOf(playerObj));
                String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, playerId);
                Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
                int playerSolvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 0;
                if (playerSolvedCount < problemCount) {
                    allCompleted = false;
                    break;
                }
            }

            if (allCompleted) {
                log.info("🏆 All players completed all {} problems! Finishing game...", problemCount);
                finishGame(gameId);
            }
        }
    }

    /**
     * 게임 종료 처리
     * - 상태 변경 (PLAYING -> END)
     * - GameService.processGameResult 호출 (포인트 지급)
     * - 참여자들의 USER_CURRENT_GAME 키 삭제
     */
    public void finishGame(Long roomId) {
        // 상태 체크
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String currentStatus = (String) redisTemplate.opsForValue().get(statusKey);

        if (!"PLAYING".equals(currentStatus)) {
            log.warn("⚠️ Cannot finish game {} - not in PLAYING state (current: {})", roomId, currentStatus);
            return;
        }

        log.info("🏁 Finishing game {}", roomId);

        // 상태 변경
        updateGameStatus(roomId, GameStatus.END);

        // 포인트 지급 (DB 저장)
        try {
            gameService.processGameResult(roomId);
        } catch (Exception e) {
            log.error("❌ Failed to process game result for Game ID: {}", roomId, e);
        }

        // 참여자들의 USER_CURRENT_GAME 키 삭제
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        Set<Object> players = redisTemplate.opsForSet().members(playersKey);
        if (players != null) {
            for (Object playerObj : players) {
                Long playerId = Long.parseLong(String.valueOf(playerObj));
                redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, playerId));
            }
        }

        log.info("✅ Game {} finished successfully", roomId);
    }

}
