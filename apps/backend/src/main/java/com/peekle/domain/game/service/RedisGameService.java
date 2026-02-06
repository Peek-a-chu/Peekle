package com.peekle.domain.game.service;

import com.peekle.domain.game.dto.request.GameChatRequest;
import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.user.entity.User;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.util.SolvedAcLevelUtil;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final RedissonClient redissonClient;
    private final GameService gameService;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final WorkbookRepository workbookRepository;
    private final WorkbookProblemRepository workbookProblemRepository;
    private final TagRepository tagRepository;

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
     * 올바른 흐름: 대기 -> 게임중 -> 종료
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

        try {
            // 2. 방 정보 Hash에 저장
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            Map<String, String> roomInfo = new HashMap<>();
            roomInfo.put("title", request.getTitle());
            roomInfo.put("maxPlayers", String.valueOf(request.getMaxPlayers()));
            // [Fix] Store timeLimit as Seconds (Input is Minutes)
            roomInfo.put("timeLimit", String.valueOf(request.getTimeLimit() * 60));
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

            // Tags 저장 (List -> String)
            if (request.getSelectedTags() != null && !request.getSelectedTags().isEmpty()) {
                roomInfo.put("tags", String.join(",", request.getSelectedTags()));
            }

            // Host 정보 조회 및 저장 (DB 조회 -> Redis 캐싱)
            User host = userRepository.findById(hostId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
            roomInfo.put("hostNickname", host.getNickname());
            roomInfo.put("hostProfileImg", host.getProfileImg() != null ? host.getProfileImg() : "");

            // 초기 상태 WAITING
            redisTemplate.opsForValue().set(String.format(RedisKeyConst.GAME_STATUS, roomId),
                    GameStatus.WAITING.name());
            redisTemplate.opsForHash().putAll(infoKey, roomInfo);

            // 3. 방 목록(Set)에 ID 추가 (검색용)
            redisTemplate.opsForSet().add(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));

            // 4. 방정 참여 처리 & Ready (Host는 자동 Ready)
            enterGameRoom(roomId, hostId, request.getPassword());
            toggleReady(roomId, hostId); // true

            return roomId;

        } catch (Exception e) {
            log.error("Failed to create game room {}, rolling back...", roomId, e);
            deleteGameRoom(roomId);
            throw e;
        }
    }

    // 방 입장
    public void enterGameRoom(Long roomId, Long userId, String password) {
        // 0-1. 중복 참여 방지 & 멱등성 보장
        String userCurrentGameKey = String.format(RedisKeyConst.USER_CURRENT_GAME, userId);
        Object currentGameIdObj = redisTemplate.opsForValue().get(userCurrentGameKey);

        if (currentGameIdObj != null) {
            String currentGameId = String.valueOf(currentGameIdObj);
            // 이미 이 방에 참여 중이면 성공 처리 (새로고침 지원)
            if (currentGameId.equals(String.valueOf(roomId))) {
                return;
            }
            throw new IllegalStateException("이미 다른 게임에 참여 중입니다. (Game ID: " + currentGameId + ")");
        }

        // 0-1-1. Players Set에 이미 존재하는지 확인 (강력한 멱등성)
        // USER_CURRENT_GAME 키가 만료되었더라도, 방 멤버 목록에 있다면 패스워드 검증 없이 통과
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        if (redisTemplate.opsForSet().isMember(playersKey, String.valueOf(userId))) {
            // 다시 USER_CURRENT_GAME 복구
            redisTemplate.opsForValue().set(
                    String.format(RedisKeyConst.USER_CURRENT_GAME, userId),
                    String.valueOf(roomId));
            return;
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

        // [New] 팀전 모드일 경우 팀 자동 배정
        String teamType = (String) roomInfo.getOrDefault("teamType", "INDIVIDUAL");
        if ("TEAM".equals(teamType)) {
            String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
            Map<Object, Object> teams = redisTemplate.opsForHash().entries(teamsKey);

            long redCount = teams.values().stream().filter("RED"::equals).count();
            long blueCount = teams.values().stream().filter("BLUE"::equals).count();

            // 인원이 적은 팀으로 배정 (동점이면 RED)
            String assignedTeam = (redCount <= blueCount) ? "RED" : "BLUE";

            redisTemplate.opsForHash().put(teamsKey, String.valueOf(userId), assignedTeam);
            log.info("User {} assigned to Team {} in Room {}", userId, assignedTeam, roomId);
        }

        // ENTER 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("ENTER", userId));

        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.USER_CURRENT_GAME, userId),
                String.valueOf(roomId));
    }

    // 팀 변경
    public void changeTeam(Long roomId, Long userId, String teamColor) {
        // [New] 팀 인원 제한 체크 (팀당 최대 4명)
        String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
        Map<Object, Object> teams = redisTemplate.opsForHash().entries(teamsKey);

        long teamCount = teams.values().stream().filter(teamColor::equals).count();
        if (teamCount >= 4) {
            throw new IllegalStateException(teamColor + "팀은 이미 가득 찼습니다.");
        }

        // 팀 정보 저장
        redisTemplate.opsForHash().put(teamsKey, String.valueOf(userId), teamColor);

        // [수정] TEAM_CHANGE -> TEAM 이벤트 발행 (명칭 통일)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("team", teamColor);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("TEAM", data));
    }

    // 소켓 연결 끊김 처리
    public void handleDisconnect(Long roomId, Long userId) {
        // [Global Socket] 연결 끊김 시 즉시 퇴장 처리
        // [Policy] Strict Mode: 게임 중(PLAYING)이라도 연결 끊기면 즉시 퇴장 (새로고침 시 튕김)
        log.info("User {} disconnected from Room {}. Exiting immediately.", userId, roomId);
        exitGameRoom(roomId, userId);
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
            log.info("�️ Game Room {} is empty. Deleting immediately.", roomId);
            deleteGameRoom(roomId);
        } else {
            // B. 남은 사람이 있으면 -> 방장 위임 체크
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");

            // 나간 사람이 방장이라면?
            if (hostIdStr != null && hostIdStr.equals(String.valueOf(userId))) {
                // 남은 사람 중 아무나 한 명 선택 (Set이라 순서 랜덤)
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

    /**
     * 방 삭제 (Clean Up)
     * 참여자가 없으면 호출
     */
    public void deleteGameRoom(Long roomId) {
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);

        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INFO, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_STATUS, roomId));
        redisTemplate.delete(playersKey); // Players Set
        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId)); // Ready Hash
        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId)); // Teams Hash
        redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));

        // 게임 진행 중 생성된 키들 삭제
        redisTemplate.delete(String.format(RedisKeyConst.GAME_START_TIME, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_RANKING, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_TEAM_RANKING, roomId));

        log.info("🗑️ Game Room {} Deleted and Resources Cleaned up.", roomId);
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

        // 3. 팀전일 경우팀 밸런스 검증
        String teamType = (String) redisTemplate.opsForHash().get(infoKey, "teamType");
        if ("TEAM".equals(teamType)) {
            String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
            Map<Object, Object> teams = redisTemplate.opsForHash().entries(teamsKey);

            long redCount = teams.values().stream().filter("RED"::equals).count();
            long blueCount = teams.values().stream().filter("BLUE"::equals).count();

            if (redCount != blueCount) {
                throw new IllegalStateException(
                        "팀 인원이 같아야 시작할 수 있습니다. (RED: " + redCount + ", BLUE: " + blueCount + ")");
            }
            if (redCount == 0) {
                throw new IllegalStateException("각 팀에 최소 1명 이상이 필요합니다.");
            }
        }

        // 게임 시작 시간 저장 (점수 계산용)
        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.GAME_START_TIME, roomId),
                String.valueOf(System.currentTimeMillis()));

        // 4. 문제 배정 로직 (Phase 4 추가)
        List<Problem> selectedProblems = selectProblems(roomId);
        if (selectedProblems.isEmpty()) {
            throw new IllegalStateException("해당 조건에 맞는 문제가 충분하지 않습니다.");
        }

        // Redis에 문제 목록 저장 (ID만 저장할지 전체 정보 저장할지 고민 -> 전체 정보 캐싱)
        String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, roomId);
        redisTemplate.delete(problemsKey); // 초기화
        for (Problem p : selectedProblems) {
            Map<String, String> pInfo = new HashMap<>();
            pInfo.put("id", String.valueOf(p.getId()));
            pInfo.put("externalId", p.getExternalId());
            pInfo.put("title", p.getTitle());
            pInfo.put("tier", p.getTier());
            pInfo.put("url", p.getUrl());
            redisTemplate.opsForList().rightPush(problemsKey, pInfo);
        }
        redisTemplate.expire(problemsKey, 6, TimeUnit.HOURS);

        // 4.5 랭킹 보드 초기화 (모두 0점으로 시작)
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);
        if (players != null) {
            for (Object player : players) {
                redisTemplate.opsForZSet().add(rankingKey, player, 0);
            }
        }
        redisTemplate.expire(rankingKey, 6, TimeUnit.HOURS);

        // 5. 상태 변경
        updateGameStatus(roomId, GameStatus.PLAYING);

        // START 이벤트 발행 (문제 목록 포함 가능)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> startData = new HashMap<>();
        startData.putAll(Map.of("gameId", roomId, "problems", selectedProblems.stream().map(p -> Map.of(
                "id", p.getId(),
                "externalId", p.getExternalId(),
                "title", p.getTitle(),
                "tier", p.getTier(),
                "url", p.getUrl())).collect(Collectors.toList())));

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("START", startData));

        // 6. 게임 종료 타이머 스케줄링 (비동기)
        scheduleGameTimeout(roomId);
    }

    // 게임 타임아웃 스케줄링
    private void scheduleGameTimeout(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String timeLimitStr = (String) redisTemplate.opsForHash().get(infoKey, "timeLimit");
        long timeLimitSeconds = (timeLimitStr != null) ? Long.parseLong(timeLimitStr) : 40; // [TEST] Default 40s

        // [Safety Margin] 네트워크 지연 등을 고려해 3초 정도 여유를 두고 실행
        long delaySeconds = timeLimitSeconds + 5 + 3; // [TEST] No * 60 + 5s Buffer (Countdown) + 3s Margin

        log.info("⏰ Scheduling game timeout for Game {} in {} seconds", roomId, delaySeconds);

        CompletableFuture.runAsync(() -> {
            try {
                // 게임 상태 확인
                String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
                String currentStatus = (String) redisTemplate.opsForValue().get(statusKey);

                if ("PLAYING".equals(currentStatus)) {
                    log.info("⌛ Time is up for Game {}. Finishing game automatically.", roomId);
                    finishGame(roomId);
                }
            } catch (Exception e) {
                log.error("Failed to execute game timeout for Game {}", roomId, e);
            }
        }, CompletableFuture.delayedExecutor(delaySeconds, TimeUnit.SECONDS));
    }

    private List<Problem> selectProblems(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

        String problemSource = (String) roomInfo.getOrDefault("problemSource", "BOJ_RANDOM");
        int problemCount = parseIntSafe((String) roomInfo.getOrDefault("problemCount", "5"));

        if ("WORKBOOK".equals(problemSource)) {
            String workbookIdStr = (String) roomInfo.get("selectedWorkbookId");
            if (workbookIdStr != null) {
                try {
                    // Try to parse workbook ID (assuming Long for DB)
                    // If frontend sends 'wb1' (mock), we handle it or catch exception
                    Long workbookId;
                    if (workbookIdStr.startsWith("wb")) {
                        // Mock data compatibility: map 'wb1' -> 1L if needed, or just log warn
                        // For this task, we assume backend DB has IDs 1, 2, ...
                        // We'll strip 'wb' if present, or just try parse
                        workbookId = Long.parseLong(workbookIdStr.replace("wb", ""));
                    } else {
                        workbookId = Long.parseLong(workbookIdStr);
                    }

                    return workbookRepository.findById(workbookId)
                            .map(workbook -> {
                                List<WorkbookProblem> wpList = workbookProblemRepository
                                        .findByWorkbookWithProblem(workbook);
                                List<Problem> problems = wpList.stream().map(WorkbookProblem::getProblem)
                                        .collect(Collectors.toList());
                                Collections.shuffle(problems);
                                return problems.stream().limit(problemCount).collect(Collectors.toList());
                            }).orElse(Collections.emptyList());
                } catch (Exception e) {
                    log.error("Failed to load workbook problems for ID: {}", workbookIdStr);
                    // Fallback to BOJ Random if workbook fails? Or return empty?
                    // Return empty to signal error
                    return Collections.emptyList();
                }
            }
        }

        // BOJ_RANDOM logic
        String tierMin = (String) roomInfo.getOrDefault("tierMin", "Bronze 5");
        String tierMax = (String) roomInfo.getOrDefault("tierMax", "Gold 1");

        List<String> tiersInRange = getTiersInRange(tierMin, tierMax);
        // [New] Tag Logic or Fallback
        String tagsStr = (String) roomInfo.get("tags");
        if (tagsStr != null && !tagsStr.isEmpty()) {
            List<String> tags = Arrays.asList(tagsStr.split(","));
            return problemRepository.findRandomProblemsByTiersAndTags(tiersInRange, tags, problemCount);
        }

        return problemRepository.findRandomProblemsByTiers(tiersInRange, problemCount);
    }

    private List<String> getTiersInRange(String tierMin, String tierMax) {
        int startLevel = getMinLevelOfTier(tierMin); // E.g., Gold -> Base(10) + 1 = 11 (Gold 5)
        int endLevel = getMaxLevelOfTier(tierMax); // E.g., Gold -> Base(10) + 5 = 15 (Gold 1)

        // [Safe] Swap if inverted (e.g. Min=Gold, Max=Silver)
        if (startLevel > endLevel) {
            // Recalculate levels relative to the swapped tiers
            // If Min=Gold(11~15), Max=Silver(6~10)
            // We want Silver 5 (6) to Gold 1 (15)
            // So we take Min(Silver) and Max(Gold)
            startLevel = getMinLevelOfTier(tierMax);
            endLevel = getMaxLevelOfTier(tierMin);
        }

        List<String> result = new ArrayList<>();
        for (int i = startLevel; i <= endLevel; i++) {
            result.add(SolvedAcLevelUtil.convertLevelToTier(i));
        }
        return result;
    }

    // "gold" -> Gold 5 (Level 11)
    private int getMinLevelOfTier(String tier) {
        // If specific tier like "Gold 3", parse explicitly if needed.
        // But for this requirement, input is generic "Gold".
        return getBaseLevel(tier) + 1;
    }

    // "gold" -> Gold 1 (Level 15)
    private int getMaxLevelOfTier(String tier) {
        return getBaseLevel(tier) + 5;
    }

    private int getBaseLevel(String tier) {
        if (tier == null)
            return 0;
        // Check if tier contains specific step (e.g. "Gold 3") - Not expected from
        // frontend currently but safe to handle?
        // Current frontend sends "gold", "silver" etc.
        String t = tier.toLowerCase().trim();
        if (t.contains("bronze"))
            return 0;
        if (t.contains("silver"))
            return 5;
        if (t.contains("gold"))
            return 10;
        if (t.contains("platinum"))
            return 15;
        if (t.contains("diamond"))
            return 20;
        if (t.contains("ruby"))
            return 25;
        return 0; // Default
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

        // [New] 보낸 사람 정보 조회
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // 데이터 패킹
        Map<String, Object> chatData = new HashMap<>();
        chatData.put("senderId", userId);
        chatData.put("senderNickname", sender.getNickname());
        chatData.put("profileImg", sender.getProfileImg());
        chatData.put("message", request.getMessage());
        chatData.put("teamColor", request.getTeamColor());
        chatData.put("timestamp", System.currentTimeMillis());

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("CHAT", chatData));
    }

    // 코드 저장
    public void updateCode(com.peekle.domain.game.dto.request.GameCodeRequest request, Long userId) {
        String codeKey = String.format(RedisKeyConst.GAME_CODE_KEY, request.getGameId(), request.getProblemId(),
                userId);

        // [Anti-Cheat] 이전 길이와 비교하여 급등(붙여넣기 의심) 체크
        try {
            String oldCode = (String) redisTemplate.opsForValue().get(codeKey);
            int oldLen = normalizeCodeLength(oldCode);
            int newLen = normalizeCodeLength(request.getCode());
            int delta = newLen - oldLen;

            if (delta > 100) {
                log.warn("[Anti-Cheat] Suspicious code growth detected: Game {}, User {}, Delta {}",
                        request.getGameId(), userId, delta);

                String alertTopic = String.format(RedisKeyConst.TOPIC_GAME_ALERT, request.getGameId(), userId);
                SocketResponse<String> alert = SocketResponse.of("CHEATING_DETECTED", "붙여넣기 또는 대량 코드 유입이 감지되었습니다!");
                redisPublisher.publish(new ChannelTopic(alertTopic), alert);
            }
        } catch (Exception e) {
            log.error("[Anti-Cheat] Error during delta check", e);
        }

        redisTemplate.opsForValue().set(codeKey, request.getCode());
        redisTemplate.expire(codeKey, 6, TimeUnit.HOURS); // 6시간 후 자동 삭제
    }

    // [New] 코드 제출 요청 시 예상 길이 저장 (검증용)
    public void submitCode(com.peekle.domain.game.dto.request.GameSubmitRequest request, Long userId) {
        String key = String.format(RedisKeyConst.GAME_EXPECTED_LENGTH, request.getGameId(), request.getProblemId(),
                userId);
        int normalizedLength = normalizeCodeLength(request.getCode());

        log.info("[RedisGameService] Storing expected length for game {}: user {}, problem {}, length {}",
                request.getGameId(), userId, request.getProblemId(), normalizedLength);

        redisTemplate.opsForValue().set(key, String.valueOf(normalizedLength));
        redisTemplate.expire(key, 1, TimeUnit.HOURS); // 제출 검증용이므로 1시간이면 충분
    }

    // 코드 길이 정규화 (공백 제거, 개행 문자 통일)
    private int normalizeCodeLength(String code) {
        if (code == null)
            return 0;
        return code.replace("\r\n", "\n").trim().length();
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

        // 2. 각 방의 정보 조회 Safe Parsing
        return roomIds.stream()
                .map(id -> {
                    try {
                        return getGameRoom(Long.parseLong((String) id));
                    } catch (Exception e) {
                        log.error("Failed to parse game room info for ID: {}", id, e);
                        return null; // Skip invalid rooms
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
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

        // 호스트 정보 매핑
        GameRoomResponse.HostInfo hostInfo = GameRoomResponse.HostInfo.builder()
                .id(parseLongSafe((String) info.getOrDefault("hostId", "0")))
                .nickname((String) info.getOrDefault("hostNickname", "Unknown"))
                .profileImg((String) info.getOrDefault("hostProfileImg", ""))
                .build();

        // 태그 정보 매핑
        List<String> tags = new ArrayList<>();
        if (info.containsKey("tags")) {
            tags = Arrays.asList(((String) info.get("tags")).split(","));
        }

        // 참여자 목록 조회
        List<GameRoomResponse.ParticipantInfo> participants = getParticipants(roomId);

        // [New] 문제 목록 조회 (게임 중이거나 종료된 경우)
        List<GameRoomResponse.ProblemInfo> problems = new ArrayList<>();
        GameStatus gameStatus = status != null ? GameStatus.valueOf(status) : GameStatus.WAITING;

        if (gameStatus == GameStatus.PLAYING || gameStatus == GameStatus.END) {
            String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, roomId);
            List<Object> pList = redisTemplate.opsForList().range(problemsKey, 0, -1);
            if (pList != null) {
                for (Object item : pList) {
                    if (item instanceof Map) {
                        Map<String, String> pInfo = (Map<String, String>) item;
                        problems.add(GameRoomResponse.ProblemInfo.builder()
                                .id(Long.parseLong(pInfo.get("id")))
                                .externalId(pInfo.get("externalId"))
                                .title(pInfo.get("title"))
                                .tier(pInfo.get("tier"))
                                .url(pInfo.get("url"))
                                .build());
                    }
                }
            }
        }

        return GameRoomResponse.builder()
                .roomId(roomId)
                .title((String) info.get("title"))
                .isSecret(info.containsKey("password"))
                .status(gameStatus)
                .maxPlayers(parseIntSafe((String) info.getOrDefault("maxPlayers", "4")))
                .timeLimit(parseIntSafe((String) info.getOrDefault("timeLimit", "1800")))
                .problemCount(parseIntSafe((String) info.getOrDefault("problemCount", "10")))
                .tierMin((String) info.getOrDefault("tierMin", "Bronze 5"))
                .tierMax((String) info.getOrDefault("tierMax", "Gold 1"))
                .teamType(GameType.valueOf((String) info.getOrDefault("teamType", "INDIVIDUAL")))
                .mode(GameMode.valueOf((String) info.getOrDefault("mode", "TIME_ATTACK")))
                .host(hostInfo)
                .tags(translateTagsToKo(tags))
                .currentPlayers(participants.size())
                .participants(participants)
                .problems(problems.isEmpty() ? null : problems)
                .build();
    }

    private List<String> translateTagsToKo(List<String> tagKeys) {
        if (tagKeys == null || tagKeys.isEmpty())
            return Collections.emptyList();

        return tagKeys.stream()
                .map(key -> tagRepository.findByKey(key.trim().toLowerCase())
                        .map(com.peekle.domain.problem.entity.Tag::getName)
                        .orElse(key))
                .collect(Collectors.toList());
    }

    private List<GameRoomResponse.ParticipantInfo> getParticipants(Long roomId) {
        Set<Object> playerIds = redisTemplate.opsForSet()
                .members(String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId));
        if (playerIds == null || playerIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Ready Status Map
        Map<Object, Object> readyStatusMap = redisTemplate.opsForHash()
                .entries(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId));
        // Team Map
        Map<Object, Object> teamMap = redisTemplate.opsForHash()
                .entries(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId));

        // Host ID for host check
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");

        return playerIds.stream()
                .map(idObj -> {
                    Long userId = Long.parseLong((String) idObj);
                    return userRepository.findById(userId)
                            .map(user -> GameRoomResponse.ParticipantInfo.builder()
                                    .id(userId)
                                    .nickname(user.getNickname())
                                    .profileImg(user.getProfileImg())
                                    .isHost(String.valueOf(userId).equals(hostIdStr))
                                    .isReady("true".equals(readyStatusMap.get(String.valueOf(userId))))
                                    .team((String) teamMap.get(String.valueOf(userId)))
                                    .build())
                            .orElse(null);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private Long parseLongSafe(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private Integer parseIntSafe(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    // 문제 해결 (SubmissionService에서 호출)
    public void solveProblem(Long userId, Long gameId, Long problemId) {

        // 0. 게임 상태 체크 (PLAYING만 가능)
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, gameId);
        String currentStatus = (String) redisTemplate.opsForValue().get(statusKey);
        if (!"PLAYING".equals(currentStatus)) {
            log.warn("❌ Rejected submission for Game {}: Status is {} (Must be PLAYING)", gameId, currentStatus);
            return;
        }

        // 1. 문제 유효성 검증 (현재 게임에 출제된 문제인지 확인)
        String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, gameId);
        List<Object> problemList = redisTemplate.opsForList().range(problemsKey, 0, -1);
        boolean isValidProblem = false;
        if (problemList != null) {
            for (Object pObj : problemList) {
                if (pObj instanceof Map) {
                    Map<String, String> pInfo = (Map<String, String>) pObj;
                    if (String.valueOf(problemId).equals(pInfo.get("id"))) {
                        isValidProblem = true;
                        break;
                    }
                }
            }
        }

        if (!isValidProblem) {
            log.warn("❌ Invalid Problem ID {} submitted for Game {}", problemId, gameId);
            return;
        }

        // 2. 해결 처리 (Atomic Operation for Race Condition Prevention)
        String solvedKey = String.format(RedisKeyConst.GAME_SOLVED_PROBLEM, gameId, problemId);
        Long addedCount = redisTemplate.opsForSet().add(solvedKey, String.valueOf(userId));

        // add의 반환값이 0이면 이미 존재하는 멤버 -> 중복 처리 방지
        if (addedCount == null || addedCount == 0) {
            log.info("ℹ️ User {} already solved Problem {} in Game {} (Duplicate submission ignored)", userId,
                    problemId, gameId);
            return;
        }

        redisTemplate.expire(solvedKey, 6, TimeUnit.HOURS); // 6시간 후 자동 삭제

        // 3. 경과 시간 계산
        String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, gameId);
        String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);

        long startTime = (startTimeStr != null) ? Long.parseLong(startTimeStr) : System.currentTimeMillis();
        long elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000;

        // 4. 개인 기록 업데이트 (Hash: solvedCount, totalTime)
        String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, userId);
        redisTemplate.opsForHash().increment(scoreKey, "solvedCount", 1);
        redisTemplate.opsForHash().increment(scoreKey, "totalTime", elapsedSeconds);
        redisTemplate.opsForHash().put(scoreKey, "lastSolvedSeconds", String.valueOf(elapsedSeconds));
        // [NEW] 마지막 문제 해결 시간 기록 (게임 시작 기준 경과 시간, 초 단위)
        redisTemplate.opsForHash().put(scoreKey, "lastSolvedSeconds", String.valueOf(elapsedSeconds));
        redisTemplate.expire(scoreKey, 6, TimeUnit.HOURS); // 6시간 후 자동 삭제

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
        // [Modified] Change topic to TOPIC_GAME_ROOM so frontend listens to it
        // correctly
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, gameId);
        Map<String, Object> solvedData = new HashMap<>();
        solvedData.put("userId", userId);
        solvedData.put("problemId", problemId);
        solvedData.put("teamColor", teamColor);
        solvedData.put("score", score);
        solvedData.put("solvedCount", solvedCount);

        // 닉네임 조회 및 추가
        try {
            String nickname = userRepository.findById(userId).map(User::getNickname).orElse("Unknown");
            solvedData.put("nickname", nickname);
        } catch (Exception e) {
            solvedData.put("nickname", "Unknown");
        }

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("SOLVED", solvedData));

        // 7. 랭킹 이벤트 발행 (실시간 랭킹 업데이트용)
        String rankingTopic = String.format(RedisKeyConst.TOPIC_GAME_RANKING, gameId);
        Map<String, Object> rankingData = new HashMap<>();
        rankingData.put("userId", userId);
        rankingData.put("score", score);
        rankingData.put("solvedCount", solvedCount);
        rankingData.put("teamColor", teamColor);

        // 랭킹 업데이트에도 닉네임 추가
        try {
            String nickname = userRepository.findById(userId).map(User::getNickname).orElse("Unknown");
            rankingData.put("nickname", nickname);
        } catch (Exception e) {
            rankingData.put("nickname", "Unknown");
        }

        redisPublisher.publish(new ChannelTopic(rankingTopic), SocketResponse.of("RANKING_UPDATE", rankingData));

        // 8. 게임 종료 조건 체크 (스피드 레이스 or 타임어택 팀전)
        String modeStr = (String) redisTemplate.opsForHash().get(infoKey, "mode");
        checkGameEndCondition(gameId, teamColor, teamTypeStr, modeStr);
    }

    /**
     * 게임 종료 조건 체크
     * - 스피드 레이스 (개인/팀): 모두(개인) 또는 한 팀(팀)이 다 풀면 종료
     * - 타임 어택 (팀): 한 팀이 다 풀면 종료 (개인전은 시간 종료까지 대기)
     */
    private void checkGameEndCondition(Long gameId, String solverTeam, String teamType, String mode) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String problemCountStr = (String) redisTemplate.opsForHash().get(infoKey, "problemCount");
        int problemCount = (problemCountStr != null) ? Integer.parseInt(problemCountStr) : 10;

        // 1. 팀전 종료 조건 (스피드 레이스 OR 타임어택) -> 한 팀이라도 다 풀면 끝
        if ("TEAM".equals(teamType) && solverTeam != null) {
            // 팀전: 해당 팀의 점수(푼 문제 수)가 problemCount 이상인지 확인
            String teamRankingKey = String.format(RedisKeyConst.GAME_TEAM_RANKING, gameId);
            Double teamScore = redisTemplate.opsForZSet().score(teamRankingKey, solverTeam);

            if (teamScore != null && teamScore >= problemCount) {
                log.info("🏆 Team {} completed all {} problems in mode {}! Finishing game...", solverTeam, problemCount,
                        mode);
                finishGame(gameId);
            }
        }
        // 2. 개인전 스피드 레이스 종료 조건 -> 모든 참가자가 다 풀어야 끝
        else if ("SPEED_RACE".equals(mode) && !"TEAM".equals(teamType)) {
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

        // 1. 상태 변경
        updateGameStatus(roomId, GameStatus.END);

        // 승자 및 팀 정보 선행 계산 및 조회
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String teamType = (String) redisTemplate.opsForHash().get(infoKey, "teamType");
        String mode = (String) redisTemplate.opsForHash().get(infoKey, "mode");
        Object timeLimitObj = redisTemplate.opsForHash().get(infoKey, "timeLimit");
        int timeLimit = (timeLimitObj != null) ? Integer.parseInt(String.valueOf(timeLimitObj)) : 0;
        Object problemCountObj = redisTemplate.opsForHash().get(infoKey, "problemCount");
        int problemCount = (problemCountObj != null) ? Integer.parseInt(String.valueOf(problemCountObj)) : 0;
        Map<String, Double> teamRankingMap = new HashMap<>();
        String winner = null;

        // 랭킹 조회 (승자 결정용)
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);
        Set<ZSetOperations.TypedTuple<Object>> rankingSet = redisTemplate.opsForZSet()
                .reverseRangeWithScores(rankingKey, 0, -1);

        List<Map<String, Object>> rankingList = new ArrayList<>();

        if ("TEAM".equals(teamType)) {
            String teamRankingKey = String.format(RedisKeyConst.GAME_TEAM_RANKING, roomId);
            Set<ZSetOperations.TypedTuple<Object>> teamSet = redisTemplate.opsForZSet()
                    .reverseRangeWithScores(teamRankingKey, 0, -1);

            if (teamSet != null) {
                for (ZSetOperations.TypedTuple<Object> t : teamSet) {
                    teamRankingMap.put(String.valueOf(t.getValue()), t.getScore());
                }
                // 1등 팀 선정
                if (!teamSet.isEmpty()) {
                    winner = String.valueOf(teamSet.iterator().next().getValue());
                }
            }
        } else {
            // 개인전 우승자
            if (rankingSet != null && !rankingSet.isEmpty()) {
                winner = String.valueOf(rankingSet.iterator().next().getValue());
            }
        }

        // 2. 포인트 지급 및 결과 처리
        Map<Long, Integer> gainedPointsMap = new HashMap<>();
        try {
            // Refactored method call
            gainedPointsMap = gameService.processGameResult(roomId, winner, teamType);
        } catch (Exception e) {
            log.error("❌ Failed to process game result for Game ID: {}", roomId, e);
        }

        // 3. 최종 랭킹 리스트 구성 (Event Payload)
        if (rankingSet != null) {
            for (ZSetOperations.TypedTuple<Object> entry : rankingSet) {
                Long uId = Long.parseLong(String.valueOf(entry.getValue()));
                Double s = entry.getScore();

                // User Entity 조회 (리그 정보 등)
                User user = userRepository.findById(uId).orElse(null);
                String nickname = (user != null) ? user.getNickname() : "Unknown";
                String league = (user != null) ? user.getLeague().name() : "STONE";
                int currentExp = (user != null) ? user.getLeaguePoint() : 0;

                // 팀 정보 조회
                String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
                String tColor = (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(uId));

                // 푼 문제 수 조회
                String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, roomId, uId);
                Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
                int solvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 0;

                Object lastSolvedObj = redisTemplate.opsForHash().get(scoreKey, "lastSolvedSeconds");
                long lastSolvedSec = (lastSolvedObj != null) ? Long.parseLong(String.valueOf(lastSolvedObj)) : 0;
                long clearTime = lastSolvedSec;

                // [NEW] Calculate Total Game Duration
                String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, roomId);
                String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);
                long startTime = (startTimeStr != null) ? Long.parseLong(startTimeStr) : System.currentTimeMillis();
                long totalDuration = (System.currentTimeMillis() - startTime) / 1000;

                if ("TIME_ATTACK".equals(mode) && solvedCount < problemCount) {
                    clearTime = (long) timeLimit;
                } else if ("SPEED_RACE".equals(mode) && solvedCount < problemCount) {
                    // [New] Speed Race: If not finished, show total elapsed time
                    clearTime = totalDuration;
                }

                Map<String, Object> userRank = new HashMap<>();
                userRank.put("userId", uId);
                userRank.put("nickname", nickname);
                userRank.put("score", s);
                userRank.put("solvedCount", solvedCount);
                userRank.put("teamColor", tColor);
                userRank.put("clearTime", clearTime);

                // [NEW] League Info
                userRank.put("profileImg", (user != null) ? user.getProfileImg() : null);
                userRank.put("league", league);
                userRank.put("currentExp", currentExp);
                userRank.put("gainedExp", gainedPointsMap.getOrDefault(uId, 0));
                // maxExp is removed as requested

                rankingList.add(userRank);
            }
        }

        // 5. GAME_END 이벤트 발행
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        Map<String, Object> endData = new HashMap<>();
        endData.put("status", "END");
        endData.put("ranking", rankingList);
        endData.put("teamRanking", teamRankingMap);
        endData.put("winner", winner);
        endData.put("teamType", teamType);

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("GAME_END", endData));

        // 6. 참여자들의 USER_CURRENT_GAME 키 삭제
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        Set<Object> players = redisTemplate.opsForSet().members(playersKey);
        if (players != null) {
            for (Object playerObj : players) {
                Long playerId = Long.parseLong(String.valueOf(playerObj));
                redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, playerId));
            }
        }

        log.info("✅ Game {} finished successfully. Winner: {}", roomId, winner);
    }

    public Long getUserCurrentGameId(Long userId) {
        String key = String.format(RedisKeyConst.USER_CURRENT_GAME, userId);
        Object gameIdObj = redisTemplate.opsForValue().get(key);
        if (gameIdObj != null) {
            try {
                return Long.parseLong(String.valueOf(gameIdObj));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
