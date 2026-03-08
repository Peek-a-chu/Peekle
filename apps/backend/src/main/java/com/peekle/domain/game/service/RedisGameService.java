package com.peekle.domain.game.service;

import com.peekle.domain.game.dto.request.GameChatRequest;
import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.response.CurrentGameResponse;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.metrics.BenchmarkSqlStatisticsService;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.user.entity.User;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.util.SolvedAcLevelUtil;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameService {

    private static final String METRIC_GAME_START_DURATION = "game.start.duration";
    private static final String METRIC_GAME_CREATE_DURATION = "game.create.duration";
    private static final String METRIC_GAME_START_FAILURE = "game.start.failure";
    private static final String METRIC_GAME_START_SQL_COUNT = "game.start.sql_count";
    private static final String METRIC_GAME_CREATE_SQL_COUNT = "game.create.sql_count";
    private static final String METRIC_GAME_FINISH_DURATION = "game.finish.duration";
    private static final String METRIC_GAME_FINISH_SQL_COUNT = "game.finish.sql_count";
    private static final String METRIC_GAME_FINISH_RESULT_PROCESSED = "game.finish.result.processed";
    private static final String METRIC_GAME_FINISH_EVENT_PUBLISHED = "game.finish.event.published";
    private static final String METRIC_GAME_FINISH_CLAIM_GRANTED = "game.finish.claim.granted";
    private static final String METRIC_GAME_FINISH_CLAIM_REJECTED = "game.finish.claim.rejected";
    private static final String RESULT_SUCCESS = "success";
    private static final String RESULT_FAILURE = "failure";
    private static final String FINISH_RESULT_PROCESSED = "processed";
    private static final String FINISH_RESULT_CLAIM_REJECTED = "claim_rejected";
    private static final String FINISH_RESULT_NOOP_NON_PLAYING = "noop_non_playing";
    private static final String FINISH_RESULT_FAILED = "failed";
    private static final String FINISH_TRIGGER_MANUAL = "manual";
    private static final String FINISH_TRIGGER_SCHEDULER = "scheduler";
    private static final String FINISH_TRIGGER_TIMEOUT_ASYNC = "timeout_async";
    private static final String FINISH_TRIGGER_SOLVE = "solve";
    private static final String FINISH_TRIGGER_GRACE_TIMEOUT = "grace_timeout";
    private static final long FINISH_CLAIM_TTL_SECONDS = 300L;
    private static final long FINISH_CLAIM_RESULT_NOOP_NON_PLAYING = 0L;
    private static final long FINISH_CLAIM_RESULT_GRANTED = 1L;
    private static final long FINISH_CLAIM_RESULT_GRANTED_FROM_STALE_ENDING = 2L;
    private static final long FINISH_CLAIM_RESULT_REJECTED = -1L;
    private static final String CACHE_STATUS_HIT = "hit";
    private static final String CACHE_STATUS_FALLBACK = "fallback";
    private static final String CACHE_STATUS_MISS = "miss";
    private static final String CACHE_STATUS_DB = "db";
    private static final String CACHE_STATUS_NA = "na";
    private static final DefaultRedisScript<Long> FINISH_CLAIM_ACQUIRE_SCRIPT = buildLongScript(
            "local currentStatus = redis.call('GET', KEYS[1])\n"
                    + "local hasClaim = redis.call('EXISTS', KEYS[2])\n"
                    + "if currentStatus == ARGV[1] then\n"
                    + "  if hasClaim == 1 then\n"
                    + "    return -1\n"
                    + "  end\n"
                    + "  redis.call('SET', KEYS[2], ARGV[3], 'EX', " + FINISH_CLAIM_TTL_SECONDS + ")\n"
                    + "  redis.call('SET', KEYS[1], ARGV[2])\n"
                    + "  return 1\n"
                    + "end\n"
                    + "if currentStatus == ARGV[2] then\n"
                    + "  if hasClaim == 1 then\n"
                    + "    return -1\n"
                    + "  end\n"
                    + "  redis.call('SET', KEYS[2], ARGV[3], 'EX', " + FINISH_CLAIM_TTL_SECONDS + ")\n"
                    + "  return 2\n"
                    + "end\n"
                    + "return 0\n");
    private static final DefaultRedisScript<Long> FINISH_CLAIM_ROLLBACK_SCRIPT = buildLongScript(
            "local currentClaim = redis.call('GET', KEYS[2])\n"
                    + "if currentClaim ~= ARGV[1] then\n"
                    + "  return 0\n"
                    + "end\n"
                    + "redis.call('DEL', KEYS[2])\n"
                    + "if redis.call('GET', KEYS[1]) == ARGV[3] then\n"
                    + "  redis.call('SET', KEYS[1], ARGV[2])\n"
                    + "  return 1\n"
                    + "end\n"
                    + "return 2\n");
    private static final Map<String, String> DEFAULT_TEMPLATES = new HashMap<>();

    static {
        DEFAULT_TEMPLATES.put("python", "import sys\n\n# 코드를 작성해주세요\nprint(\"Hello World!\")");
        DEFAULT_TEMPLATES.put("java",
                "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // 코드를 작성해주세요\n        System.out.println(\"Hello World!\");\n    }\n}");
        DEFAULT_TEMPLATES.put("cpp",
                "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    // 코드를 작성해주세요\n    cout << \"Hello World!\" << endl;\n    return 0;\n}");
    }

    private static DefaultRedisScript<Long> buildLongScript(String scriptText) {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setScriptText(scriptText);
        script.setResultType(Long.class);
        return script;
    }

    private static final class FinishClaimState {
        private final long resultCode;
        private final String claimToken;

        private FinishClaimState(long resultCode, String claimToken) {
            this.resultCode = resultCode;
            this.claimToken = claimToken;
        }

        private boolean isGranted() {
            return resultCode == FINISH_CLAIM_RESULT_GRANTED
                    || resultCode == FINISH_CLAIM_RESULT_GRANTED_FROM_STALE_ENDING;
        }

        private boolean isRecoveredFromStaleEnding() {
            return resultCode == FINISH_CLAIM_RESULT_GRANTED_FROM_STALE_ENDING;
        }
    }

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final RedissonClient redissonClient;
    private final GameService gameService;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final WorkbookRepository workbookRepository;
    private final WorkbookProblemRepository workbookProblemRepository;
    private final RedisGameWaitService waitService;
    private final RedisGameRoomManager roomManager;
    private final WorkbookPreviewCacheService workbookPreviewCacheService;
    private final MeterRegistry meterRegistry;
    private final Optional<BenchmarkSqlStatisticsService> benchmarkSqlStatisticsService;

    @Value("${benchmark.game-finish.claim-enabled:true}")
    private boolean finishClaimEnabled;

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
        RLock lock = getGameStatusLock(roomId);

        try {
            // 2. 락 획득 시도 (tryLock)
            // waitTime(2초): 락을 얻을 때까지 최대 2초간 대기합니다.
            // leaseTime(3초): 락을 얻은 후 3초가 지나면 자동으로 해제됩니다 (Deadlock 방지).
            if (!lock.tryLock(2, 3, TimeUnit.SECONDS)) {
                throw new IllegalStateException("현재 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.");
            }

            updateGameStatusInternal(roomId, nextStatus);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Lock interrupted", e);
        } finally {
            // 8. 락 해제
            // 반드시 finally 블록에서 해제해야 예외가 발생해도 락이 풀립니다.
            // isHeldByCurrentThread: 내가 건 락인지 확인하고 해제합니다.
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private RLock getGameStatusLock(Long roomId) {
        return redissonClient.getLock(String.format(RedisKeyConst.LOCK_GAME_STATUS, roomId));
    }

    private void updateGameStatusInternal(Long roomId, GameStatus nextStatus) {
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        GameStatus currentStatus = getCurrentGameStatus(roomId);

        validateStatusTransition(currentStatus, nextStatus);

        redisTemplate.opsForValue().set(statusKey, nextStatus.name());
        log.info("Game Room {} Status Changed: {} -> {}", roomId, currentStatus, nextStatus);

        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("STATUS_CHANGE", nextStatus));

        Map<String, Object> lobbyUpdateData = new HashMap<>();
        lobbyUpdateData.put("roomId", roomId);
        lobbyUpdateData.put("status", nextStatus.name());
        redisPublisher.publish(
                new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                SocketResponse.of("LOBBY_ROOM_UPDATED", lobbyUpdateData));
        log.info("📢 [Lobby] Game Room {} Status Updated to {} - Broadcasting to lobby", roomId, nextStatus);
    }

    private GameStatus getCurrentGameStatus(Long roomId) {
        String currentStatusStr = (String) redisTemplate.opsForValue()
                .get(String.format(RedisKeyConst.GAME_STATUS, roomId));
        return currentStatusStr == null ? GameStatus.WAITING : GameStatus.valueOf(currentStatusStr);
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

            // 게임 중(PLAYING)에는 -> 종료 처리중(ENDING) 또는 종료(END)만 가능
            case PLAYING -> next == GameStatus.ENDING || next == GameStatus.END;

            // 종료 처리중(ENDING)에서는 -> 오직 종료(END)만 가능
            case ENDING -> next == GameStatus.END;

            // 이미 종료(END)된 게임은 -> 상태 변경 불가
            case END -> false;
        };

        if (!isValid) {
            throw new IllegalStateException(String.format("잘못된 상태 변경 요청입니다: %s -> %s", current, next));
        }
    }

    // 방 만들기
    public Long createGameRoom(GameCreateRequest request, Long hostId) {
        Timer.Sample timerSample = Timer.start(meterRegistry);
        long sqlSnapshot = snapshotSqlCount();
        String problemSource = request.getProblemSource() != null ? request.getProblemSource() : "BOJ_RANDOM";
        boolean success = false;

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
            roomInfo.put("problemSource", problemSource);

            // Field Mapping
            roomInfo.put("teamType", request.getTeamType().name());
            roomInfo.put("mode", request.getMode().name());
            roomInfo.put("hostId", String.valueOf(hostId));

            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                roomInfo.put("password", request.getPassword());
            }

            // 추가 옵션 저장
            if (request.getTierMin() != null)
                roomInfo.put("tierMin", request.getTierMin());
            if (request.getTierMax() != null)
                roomInfo.put("tierMax", request.getTierMax());
            if (request.getSelectedWorkbookId() != null) {
                roomInfo.put("selectedWorkbookId", request.getSelectedWorkbookId());
                log.info("📚 [Create Room] Saving selectedWorkbookId: {}", request.getSelectedWorkbookId());
            } else {
                log.info("ℹ️ [Create Room] No selectedWorkbookId (random mode)");
            }

            // Tags 저장 (List -> String)
            if (request.getSelectedTags() != null && !request.getSelectedTags().isEmpty()) {
                roomInfo.put("tags", String.join(",", request.getSelectedTags()));
            }

            if ("WORKBOOK".equals(problemSource)) {
                roomInfo.put(WorkbookPreviewCacheService.PREVIEW_READY_FIELD, "false");
                roomInfo.put(WorkbookPreviewCacheService.PREVIEW_COUNT_FIELD, "0");
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

            // 3.5 문제 전체 조회 및 캐싱 (WORKBOOK 모드일 때만)
            // [CRITICAL] enterGameRoom 이전에 실행하여 브로드캐스트 시 문제 목록이 포함되도록 함
            if ("WORKBOOK".equals(problemSource)) {
                workbookPreviewCacheService.prepareWorkbookPreview(roomId, request.getProblemCount());
            }

            // 4. 방정 참여 처리 & Ready (Host는 자동 Ready)
            enterGameRoom(roomId, hostId, request.getPassword());
            toggleReady(roomId, hostId); // true

            // 5. BroadCast 지연 (Delay to enterGameRoom)
            // 방장(Host)이 실제로 소켓으로 입장했을 때 브로드캐스트하기 위해 여기서는 생략함.
            // "ghost room" 방지 목적.
            log.info("🔨 [Create Room] Room {} Created in Redis. Broadcast delayed until Host enters.", roomId);

            success = true;
            return roomId;

        } catch (Exception e) {
            log.error("Failed to create game room {}, rolling back...", roomId, e);
            deleteGameRoom(roomId);
            throw e;
        } finally {
            recordCreateRoomMetrics(timerSample, problemSource, success ? RESULT_SUCCESS : RESULT_FAILURE, sqlSnapshot);
        }
    }

    // 방 입장
    public void enterGameRoom(Long roomId, Long userId, String password) {
        waitService.enterGameRoom(roomId, userId, password);
    }

    // 팀 변경
    public void changeTeam(Long roomId, Long userId, String teamColor) {
        waitService.changeTeam(roomId, userId, teamColor);
    }

    // 연결 끊김 처리
    public void handleDisconnect(Long roomId, Long userId) {
        waitService.handleDisconnect(roomId, userId);
    }

    // 방 퇴장
    public void exitGameRoom(Long roomId, Long userId) {
        waitService.exitGameRoom(roomId, userId);
    }

    /**
     * 게임 포기 (Forfeit)
     */
    public void forfeitGameRoom(Long roomId, Long userId) {
        waitService.forfeitGameRoom(roomId, userId);
    }

    /**
     * 게임 포기 - 중복 메서드 삭제됨, waitService로 위임됨
     */

    /**
     * 방 삭제 (Clean Up)
     */
    public void deleteGameRoom(Long roomId) {
        roomManager.deleteGameRoom(roomId);
    }

    /**
     * 준비 토글
     */
    public void toggleReady(Long roomId, Long userId) {
        waitService.toggleReady(roomId, userId);
    }

    /**
     * 유저 강퇴
     */
    public void kickUser(Long roomId, Long userId, Long targetUserId) {
        waitService.kickUser(roomId, userId, targetUserId);
    }

    /**
     * 태그 번역
     */
    private List<String> translateTagsToKo(List<String> tagKeys) {
        return roomManager.translateTagsToKo(tagKeys);
    }

    // ==============================
    // 게임 진행 관련 메서드
    // ==============================

    // 게임 시작
    public void startGame(Long roomId, Long userId) {
        Timer.Sample timerSample = Timer.start(meterRegistry);
        long sqlSnapshot = snapshotSqlCount();
        String problemSource = CACHE_STATUS_NA;
        String cacheStatus = CACHE_STATUS_NA;
        boolean success = false;
        RLock lock = getGameStatusLock(roomId);

        try {
            if (!lock.tryLock(2, 10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("현재 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.");
            }

            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            problemSource = String.valueOf(redisTemplate.opsForHash().get(infoKey, "problemSource"));
            if ("null".equals(problemSource) || problemSource == null || problemSource.isBlank()) {
                problemSource = "BOJ_RANDOM";
            }

            if (getCurrentGameStatus(roomId) != GameStatus.WAITING) {
                throw new BusinessException(ErrorCode.GAME_ALREADY_STARTED);
            }

            String hostIdStr = (String) redisTemplate.opsForHash().get(infoKey, "hostId");
            if (hostIdStr == null || !hostIdStr.equals(String.valueOf(userId))) {
                throw new IllegalStateException("방장만 게임을 시작할 수 있습니다.");
            }

            String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
            redisTemplate.opsForHash().put(readyKey, String.valueOf(userId), "true");

            String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
            Set<Object> players = redisTemplate.opsForSet().members(playersKey);

            if (players != null) {
                for (Object player : players) {
                    String isReady = (String) redisTemplate.opsForHash().get(readyKey, player);
                    if (!"true".equals(isReady)) {
                        throw new IllegalStateException("모든 플레이어가 준비해야 시작할 수 있습니다.");
                    }
                }
            }

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

            int problemCount = parseIntSafe((String) redisTemplate.opsForHash().get(infoKey, "problemCount"));
            List<Problem> selectedProblems;

            if ("WORKBOOK".equals(problemSource)) {
                cacheStatus = CACHE_STATUS_MISS;
                WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                        workbookPreviewCacheService.selectProblemsForStart(roomId, problemCount);
                selectedProblems = selection.problems();
                cacheStatus = selection.cacheStatus();
                log.info("📋 [Game Start] Selected {} workbook problems (cache status: {}) (Room {})",
                        selectedProblems.size(), cacheStatus, roomId);
            } else {
                selectedProblems = selectProblems(roomId);
                cacheStatus = CACHE_STATUS_DB;
                log.info("📋 [Game Start] Selected {} problems from DB query (Room {})", selectedProblems.size(), roomId);
            }

            if (selectedProblems.isEmpty()) {
                throw new IllegalStateException("해당 조건에 맞는 문제가 충분하지 않습니다.");
            }

            String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, roomId);
            redisTemplate.delete(problemsKey);
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

            String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);
            if (players != null) {
                for (Object player : players) {
                    redisTemplate.opsForZSet().add(rankingKey, player, 0);
                }
            }
            redisTemplate.expire(rankingKey, 6, TimeUnit.HOURS);

            updateGameStatusInternal(roomId, GameStatus.PLAYING);

            long startTime = System.currentTimeMillis();
            redisTemplate.opsForValue().set(
                    String.format(RedisKeyConst.GAME_START_TIME, roomId),
                    String.valueOf(startTime));

            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
            Map<String, Object> startData = new HashMap<>();
            List<Map<String, Object>> problemList = selectedProblems.stream()
                    .map(p -> Map.of(
                            "id", (Object) p.getId(),
                            "externalId", (Object) p.getExternalId(),
                            "title", (Object) p.getTitle(),
                            "tier", (Object) p.getTier(),
                            "url", (Object) p.getUrl()))
                    .collect(Collectors.toList());

            startData.put("gameId", roomId);
            startData.put("problems", problemList);
            startData.put("startTime", startTime);
            startData.put("serverTime", System.currentTimeMillis());

            redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("START", startData));
            scheduleGameTimeout(roomId);
            success = true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            meterRegistry.counter(METRIC_GAME_START_FAILURE,
                    "problem_source", normalizeProblemSource(problemSource),
                    "cache", normalizeCacheStatus(cacheStatus)).increment();
            throw new IllegalStateException("Lock interrupted", e);
        } catch (Exception e) {
            meterRegistry.counter(METRIC_GAME_START_FAILURE,
                    "problem_source", normalizeProblemSource(problemSource),
                    "cache", normalizeCacheStatus(cacheStatus)).increment();
            throw e;
        } finally {
            recordStartGameMetrics(
                    timerSample,
                    problemSource,
                    success ? RESULT_SUCCESS : RESULT_FAILURE,
                    cacheStatus,
                    sqlSnapshot);
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
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
                    finishGame(roomId, FINISH_TRIGGER_TIMEOUT_ASYNC);
                }
            } catch (Exception e) {
                log.error("Failed to execute game timeout for Game {}", roomId, e);
            }
        }, CompletableFuture.delayedExecutor(delaySeconds, TimeUnit.SECONDS));
    }

    // 대기실용: 전체 문제 조회 (필터링 없이 모든 문제)
    private List<Problem> getAllProblemsForPreview(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

        String problemSource = (String) roomInfo.getOrDefault("problemSource", "BOJ_RANDOM");

        if ("WORKBOOK".equals(problemSource)) {
            String workbookIdStr = (String) roomInfo.get("selectedWorkbookId");
            if (workbookIdStr == null || workbookIdStr.isBlank()) {
                throw new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND);
            }

            Long workbookId = workbookPreviewCacheService.parseWorkbookId(workbookIdStr);
            return workbookRepository.findById(workbookId)
                    .map(workbook -> workbookProblemRepository.findByWorkbookWithProblem(workbook).stream()
                            .map(WorkbookProblem::getProblem)
                            .collect(Collectors.toList()))
                    .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));
        }

        // BOJ_RANDOM: 캐시하지 않음 (게임 시작 시 DB 직접 조회)
        return Collections.emptyList();
    }

    private List<Problem> selectProblems(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

        String problemSource = (String) roomInfo.getOrDefault("problemSource", "BOJ_RANDOM");
        int problemCount = parseIntSafe((String) roomInfo.getOrDefault("problemCount", "5"));

        if ("WORKBOOK".equals(problemSource)) {
            return sampleWithoutReplacement(getAllProblemsForPreview(roomId), problemCount);
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

    static <T> List<T> sampleWithoutReplacement(List<T> source, int sampleSize) {
        int size = source.size();
        if (sampleSize <= 0 || size == 0) {
            return Collections.emptyList();
        }
        if (sampleSize >= size) {
            return new ArrayList<>(source);
        }

        List<T> sampled = new ArrayList<>(source);
        ThreadLocalRandom random = ThreadLocalRandom.current();
        for (int i = 0; i < sampleSize; i++) {
            int swapIndex = random.nextInt(i, size);
            Collections.swap(sampled, i, swapIndex);
        }
        return new ArrayList<>(sampled.subList(0, sampleSize));
    }

    public void evictWorkbookPreview(Long roomId) {
        workbookPreviewCacheService.evictWorkbookPreview(roomId);
    }

    private long snapshotSqlCount() {
        return benchmarkSqlStatisticsService
                .map(BenchmarkSqlStatisticsService::getPrepareStatementCount)
                .orElse(-1L);
    }

    private void recordCreateRoomMetrics(Timer.Sample timerSample, String problemSource, String result, long sqlSnapshot) {
        timerSample.stop(Timer.builder(METRIC_GAME_CREATE_DURATION)
                .tag("problem_source", normalizeProblemSource(problemSource))
                .tag("result", result)
                .register(meterRegistry));
        recordSqlCount(METRIC_GAME_CREATE_SQL_COUNT, problemSource, result, CACHE_STATUS_NA, sqlSnapshot);
    }

    private void recordStartGameMetrics(
            Timer.Sample timerSample,
            String problemSource,
            String result,
            String cacheStatus,
            long sqlSnapshot) {
        timerSample.stop(Timer.builder(METRIC_GAME_START_DURATION)
                .tag("problem_source", normalizeProblemSource(problemSource))
                .tag("result", result)
                .tag("cache", normalizeCacheStatus(cacheStatus))
                .register(meterRegistry));
        recordSqlCount(METRIC_GAME_START_SQL_COUNT, problemSource, result, cacheStatus, sqlSnapshot);
    }

    private void recordFinishGameMetrics(
            Timer.Sample timerSample,
            String trigger,
            String result,
            long sqlSnapshot) {
        timerSample.stop(Timer.builder(METRIC_GAME_FINISH_DURATION)
                .tag("trigger", normalizeFinishTrigger(trigger))
                .tag("result", normalizeFinishResult(result))
                .register(meterRegistry));
        recordFinishSqlCount(trigger, result, sqlSnapshot);
    }

    private void recordSqlCount(
            String metricName,
            String problemSource,
            String result,
            String cacheStatus,
            long sqlSnapshot) {
        if (sqlSnapshot < 0) {
            return;
        }

        long sqlDelta = Math.max(snapshotSqlCount() - sqlSnapshot, 0L);
        meterRegistry.summary(metricName,
                "problem_source", normalizeProblemSource(problemSource),
                "result", result,
                "cache", normalizeCacheStatus(cacheStatus))
                .record(sqlDelta);
    }

    private void recordFinishSqlCount(String trigger, String result, long sqlSnapshot) {
        if (sqlSnapshot < 0) {
            return;
        }

        long sqlDelta = Math.max(snapshotSqlCount() - sqlSnapshot, 0L);
        meterRegistry.summary(METRIC_GAME_FINISH_SQL_COUNT,
                "trigger", normalizeFinishTrigger(trigger),
                "result", normalizeFinishResult(result))
                .record(sqlDelta);
    }

    private String normalizeProblemSource(String problemSource) {
        return problemSource == null || problemSource.isBlank() || "null".equals(problemSource)
                ? "BOJ_RANDOM"
                : problemSource;
    }

    private String normalizeCacheStatus(String cacheStatus) {
        return cacheStatus == null || cacheStatus.isBlank() ? CACHE_STATUS_NA : cacheStatus;
    }

    private String normalizeFinishTrigger(String trigger) {
        return trigger == null || trigger.isBlank() ? FINISH_TRIGGER_MANUAL : trigger;
    }

    private String normalizeFinishResult(String result) {
        return result == null || result.isBlank() ? FINISH_RESULT_FAILED : result;
    }

    private FinishClaimState tryAcquireFinishClaim(Long roomId, String trigger) {
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String claimKey = String.format(RedisKeyConst.GAME_FINISH_CLAIM, roomId);
        String claimToken = trigger + ":" + UUID.randomUUID();

        if (!finishClaimEnabled) {
            String currentStatus = (String) redisTemplate.opsForValue().get(statusKey);
            if (!GameStatus.PLAYING.name().equals(currentStatus)) {
                return new FinishClaimState(FINISH_CLAIM_RESULT_NOOP_NON_PLAYING, null);
            }
            return new FinishClaimState(FINISH_CLAIM_RESULT_GRANTED, null);
        }

        Long claimResult = redisTemplate.execute(
                FINISH_CLAIM_ACQUIRE_SCRIPT,
                List.of(statusKey, claimKey),
                GameStatus.PLAYING.name(),
                GameStatus.ENDING.name(),
                claimToken);
        long normalizedResult = claimResult != null ? claimResult : FINISH_CLAIM_RESULT_NOOP_NON_PLAYING;
        return new FinishClaimState(normalizedResult, claimToken);
    }

    private void rollbackFinishClaim(Long roomId, FinishClaimState claimState) {
        if (!finishClaimEnabled || claimState == null || !claimState.isGranted() || claimState.claimToken == null) {
            return;
        }

        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String claimKey = String.format(RedisKeyConst.GAME_FINISH_CLAIM, roomId);
        Long rollbackResult = redisTemplate.execute(
                FINISH_CLAIM_ROLLBACK_SCRIPT,
                List.of(statusKey, claimKey),
                claimState.claimToken,
                GameStatus.PLAYING.name(),
                GameStatus.ENDING.name());
        long normalizedResult = rollbackResult != null ? rollbackResult : 0L;
        if (normalizedResult == 1L) {
            log.warn("↩️ Rolled back finish claim for game {} after failure", roomId);
            return;
        }
        if (normalizedResult == 2L) {
            log.warn("🧹 Released finish claim for game {} after failure without reverting status", roomId);
        }
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
            // 0. 언어 변경 신호 명시적 확인
            if (request.isChangingLanguage()) {
                log.info("[Anti-Cheat] Language change signal detected, skipping check: Game {}, User {}",
                        request.getGameId(), userId);
            }
            // 1. 템플릿 코드인지 확인 (화이트리스트)
            else if (isDefaultTemplate(request.getCode(), request.getLanguage())) {
                log.info("[Anti-Cheat] Default template detected, skipping check: Game {}, User {}",
                        request.getGameId(), userId);
            } else {
                String oldCode = (String) redisTemplate.opsForValue().get(codeKey);
                int oldLen = normalizeCodeLength(oldCode);
                int newLen = normalizeCodeLength(request.getCode());
                int delta = newLen - oldLen;

                if (delta > 300) {
                    log.warn("[Anti-Cheat] Suspicious code growth detected: Game {}, User {}, Delta {}",
                            request.getGameId(), userId, delta);

                    String alertTopic = String.format(RedisKeyConst.TOPIC_GAME_ALERT, request.getGameId(), userId);
                    SocketResponse<String> alert = SocketResponse.of("CHEATING_DETECTED", "붙여넣기 또는 대량 코드 유입이 감지되었습니다!");
                    redisPublisher.publish(new ChannelTopic(alertTopic), alert);
                }
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

    // 템플릿 코드 확인 (공백 제거 및 ASCII만 비교, 모든 언어 템플릿 허용)
    private boolean isDefaultTemplate(String code, String language) {
        if (code == null)
            return false;

        // 공백 제거 및 Non-ASCII 제거 (한글 코멘트 등 인코딩 이슈 방지)
        String normalizedCode = code.replaceAll("\\s+", "").replaceAll("[^\\x00-\\x7F]", "");

        for (String template : DEFAULT_TEMPLATES.values()) {
            String normalizedTemplate = template.replaceAll("\\s+", "").replaceAll("[^\\x00-\\x7F]", "");
            if (normalizedCode.equals(normalizedTemplate)) {
                return true;
            }
        }

        return false;
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

        log.info("User {} (Host) kicking user {} from game room {}", hostId, targetUserId, gameId);

        // 2. 강퇴 대상 유저의 Redis 데이터 삭제 (exitGameRoom 대신 직접 처리)
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, gameId);
        redisTemplate.opsForSet().remove(playersKey, String.valueOf(targetUserId));

        // 유저의 현재 게임 정보 삭제
        redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, targetUserId));

        // 부가 정보 제거 (Ready, Team)
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, gameId),
                String.valueOf(targetUserId));
        redisTemplate.opsForHash().delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, gameId),
                String.valueOf(targetUserId));

        // 3. KICK 이벤트 발행 (닉네임 포함)
        String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, gameId);
        User kickedUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Map<String, Object> kickData = Map.of(
                "userId", targetUserId,
                "nickname", kickedUser.getNickname(),
                "message", "방장에 의해 강퇴되었습니다.");
        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("KICK", kickData));

        // 4. 남은 인원 확인 및 방장 위임
        Long remainingCount = redisTemplate.opsForSet().size(playersKey);

        if (remainingCount != null && remainingCount == 0) {
            log.info("🗑️ Game Room {} is empty after kick. Deleting immediately.", gameId);
            deleteGameRoom(gameId);
        } else if (realHostId != null && realHostId.equals(String.valueOf(targetUserId))) {
            // 강퇴된 사람이 방장이었을 경우 방장 위임
            Set<Object> members = redisTemplate.opsForSet().members(playersKey);
            if (members != null && !members.isEmpty()) {
                Object newHostIdObj = members.iterator().next();
                String newHostId = String.valueOf(newHostIdObj);

                redisTemplate.opsForHash().put(infoKey, "hostId", newHostId);

                // HOST_CHANGE 이벤트 발행 (닉네임 포함)
                User newHost = userRepository.findById(Long.valueOf(newHostId))
                        .orElseThrow(() -> new IllegalArgumentException("User not found"));

                // [Fix] Redis Host Info Update
                redisTemplate.opsForHash().put(infoKey, "hostNickname", newHost.getNickname());
                redisTemplate.opsForHash().put(infoKey, "hostProfileImg",
                        newHost.getProfileImg() != null ? newHost.getProfileImg() : "");
                Map<String, Object> hostChangeData = Map.of(
                        "newHostId", newHostId,
                        "newHostNickname", newHost.getNickname());
                redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("HOST_CHANGE", hostChangeData));
                log.info("Game Room {} Host Changed after kick: {} -> {}", gameId, targetUserId, newHostId);
            }
        }
    }

    // 방 목록 조회 (WAITING, PLAYING 상태만)
    public List<GameRoomResponse> getAllGameRooms() {
        // 1. 모든 방 ID 조회
        Set<Object> roomIds = redisTemplate.opsForSet().members(RedisKeyConst.GAME_ROOM_IDS);
        if (roomIds == null || roomIds.isEmpty())
            return Collections.emptyList();

        // 2. 각 방의 정보 조회 Safe Parsing
        return roomIds.stream()
                // 필터링: null이거나 "null" 문자열인 경우 제외
                .filter(id -> id != null && !"null".equals(String.valueOf(id)))
                .map(id -> {
                    try {
                        String roomIdStr = String.valueOf(id);
                        Long roomId = Long.parseLong(roomIdStr);
                        return getGameRoom(roomId);
                    } catch (NumberFormatException e) {
                        log.error("Invalid room ID format in Redis: '{}'. Skipping corrupted data.", id);
                        // Redis에서 손상된 데이터 자동 제거
                        redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, id);
                        return null;
                    } catch (IllegalArgumentException e) {
                        // getGameRoom에서 방이 없을 때 발생
                        log.warn("Room {} does not exist in Redis. Cleaning up ID from set.", id);
                        redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, id);
                        return null;
                    } catch (Exception e) {
                        log.error("Unexpected error while fetching game room {}: {}", id, e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                // 끝난 게임 제외 - WAITING, PLAYING만 표시
                .filter(room -> {
                    GameStatus status = room.getStatus();
                    return status == GameStatus.WAITING || status == GameStatus.PLAYING;
                })
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

        // [Updated] 문제 목록 조회
        List<GameRoomResponse.ProblemInfo> problems = new ArrayList<>();
        GameStatus gameStatus = status != null ? GameStatus.valueOf(status) : GameStatus.WAITING;

        if (gameStatus == GameStatus.PLAYING || gameStatus == GameStatus.ENDING || gameStatus == GameStatus.END) {
            // PLAYING/ENDING/END: Redis에서 조회
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
        } else if (gameStatus == GameStatus.WAITING) {
            problems = workbookPreviewCacheService.loadPreviewProblems(roomId).stream()
                    .map(problem -> GameRoomResponse.ProblemInfo.builder()
                            .id(problem.getId())
                            .externalId(problem.getExternalId())
                            .title(problem.getTitle())
                            .tier(problem.getTier())
                            .url(problem.getUrl())
                            .build())
                    .collect(Collectors.toList());
            log.info("📋 [Waiting Room] Loaded {} problems from shared workbook preview (Room {})",
                    problems.size(), roomId);
        }

        // workbook 정보 조회 (문제집인 경우)
        String workbookTitle = null;
        String selectedWorkbookIdStr = (String) info.get("selectedWorkbookId");
        if (selectedWorkbookIdStr != null) {
            try {
                workbookTitle = workbookPreviewCacheService.resolveWorkbookTitle(info);
            } catch (Exception e) {
                log.warn("Failed to load workbook title for ID: {}", selectedWorkbookIdStr);
            }
        }

        // 게임 시작 시간 조회
        String startTimeStr = (String) redisTemplate.opsForValue()
                .get(String.format(RedisKeyConst.GAME_START_TIME, roomId));
        Long startTime = startTimeStr != null ? Long.parseLong(startTimeStr) : null;

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
                .workbookTitle(workbookTitle)
                .problems(problems.isEmpty() ? null : problems)
                .startTime(startTime)
                .serverTime(System.currentTimeMillis())
                .build();
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
        // 1. 문제 유효성 검증 (현재 게임에 출제된 문제인지 확인)
        String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, gameId);
        List<Object> problemList = redisTemplate.opsForList().range(problemsKey, 0, -1);
        boolean isValidProblem = false;
        String problemTitle = "문제"; // Default title

        if (problemList != null) {
            for (Object pObj : problemList) {
                if (pObj instanceof Map) {
                    Map<String, String> pInfo = (Map<String, String>) pObj;
                    if (String.valueOf(problemId).equals(pInfo.get("id"))) {
                        isValidProblem = true;
                        problemTitle = pInfo.getOrDefault("title", "문제");
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

        // 3. 경과 시간 계산 (초 단위)
        String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, gameId);
        String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);

        long startTime = (startTimeStr != null) ? Long.parseLong(startTimeStr) : System.currentTimeMillis();
        long elapsedSeconds = (System.currentTimeMillis() - startTime) / 1000;
        long elapsedMinutes = elapsedSeconds / 60; // 분 단위 변환

        // 4. 개인 기록 업데이트 (Hash: solvedCount, totalMinutes, lastSolvedSeconds)
        String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, userId);
        redisTemplate.opsForHash().increment(scoreKey, "solvedCount", 1);
        redisTemplate.opsForHash().increment(scoreKey, "totalMinutes", elapsedMinutes);
        redisTemplate.opsForHash().put(scoreKey, "lastSolvedSeconds", String.valueOf(elapsedSeconds));
        redisTemplate.expire(scoreKey, 6, TimeUnit.HOURS); // 6시간 후 자동 삭제

        // 5. ICPC 스타일 랭킹 점수 계산 & 업데이트 (ZSet)
        // 공식: (푼 문제 수 × 100,000,000) - 총 시간(분)
        // → 문제 수가 많을수록, 시간이 적을수록 높은 점수
        Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
        Object totalMinutesObj = redisTemplate.opsForHash().get(scoreKey, "totalMinutes");

        int solvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 1;
        long totalMinutes = (totalMinutesObj != null) ? Long.parseLong(String.valueOf(totalMinutesObj))
                : elapsedMinutes;

        // ICPC 점수: 푼 문제 수 우선, 시간은 타이브레이커 (초 단위 정밀도 적용)
        double score = (solvedCount * 100000000.0) - elapsedSeconds;

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
        solvedData.put("problemTitle", problemTitle);

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
                finishGame(gameId, FINISH_TRIGGER_SOLVE);
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
            boolean anyCompleted = false;
            for (Object playerObj : players) {
                Long playerId = Long.parseLong(String.valueOf(playerObj));
                String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, playerId);
                Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
                int playerSolvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 0;
                if (playerSolvedCount < problemCount) {
                    allCompleted = false;
                } else {
                    anyCompleted = true;
                }
            }

            if (allCompleted) {
                log.info("🏆 All players completed all {} problems! Finishing game...", problemCount);
                finishGame(gameId, FINISH_TRIGGER_SOLVE);
            } else if (anyCompleted) {
                // 한 명이라도 다 풀었으면 그 사람의 닉네임을 찾아서 1분 유예 시간 시작 알림
                String finisherNickname = "누군가";
                for (Object playerObj : players) {
                    Long playerId = Long.parseLong(String.valueOf(playerObj));
                    String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, gameId, playerId);
                    Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
                    int playerSolvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj))
                            : 0;
                    if (playerSolvedCount >= problemCount) {
                        User user = userRepository.findById(playerId).orElse(null);
                        if (user != null) {
                            finisherNickname = user.getNickname();
                            break;
                        }
                    }
                }
                startIndividualSpeedRaceFinishTimer(gameId, finisherNickname);
            }
        }
    }

    /**
     * 개인전 스피드 레이스 1등 발생 시 1분 유예 타이머 시작
     */
    private void startIndividualSpeedRaceFinishTimer(Long gameId, String finisherNickname) {
        String timerKey = String.format(RedisKeyConst.GAME_FINISH_TIMER, gameId);
        Boolean alreadyStarted = redisTemplate.hasKey(timerKey);

        if (Boolean.FALSE.equals(alreadyStarted)) {
            // Redis에 플래그 설정 (동시 실행 방지 및 상태 추적)
            redisTemplate.opsForValue().set(timerKey, "started", 10, TimeUnit.MINUTES);

            log.info("⏱️ First finisher in Speed Race Game {}. Starting 1-minute grace period...", gameId);

            // 참여자들에게 타이머 시작 알림
            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, gameId);
            Map<String, Object> timerData = new HashMap<>();
            timerData.put("remainSeconds", 60);
            timerData.put("nickname", finisherNickname);
            redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("FINISH_TIMER_START", timerData));

            // 60초 뒤 게임 종료 예약
            CompletableFuture.delayedExecutor(60, TimeUnit.SECONDS).execute(() -> {
                String statusKey = String.format(RedisKeyConst.GAME_STATUS, gameId);
                String currentStatus = (String) redisTemplate.opsForValue().get(statusKey);

                // 아직 플레이 중이라면 종료 처리
                if ("PLAYING".equals(currentStatus)) {
                    log.info("⏰ Grace period ended for Game {}. Auto finishing...", gameId);
                    finishGame(gameId, FINISH_TRIGGER_GRACE_TIMEOUT);
                }
            });
        }
    }

    /**
     * 게임 종료 처리
     * - 상태 변경 (PLAYING -> END)
     * - GameService.processGameResult 호출 (포인트 지급)
     * - 참여자들의 USER_CURRENT_GAME 키 삭제
     */
    public void finishGame(Long roomId) {
        finishGame(roomId, FINISH_TRIGGER_MANUAL);
    }

    public void finishGame(Long roomId, String trigger) {
        Timer.Sample timerSample = Timer.start(meterRegistry);
        long sqlSnapshot = snapshotSqlCount();
        String normalizedTrigger = normalizeFinishTrigger(trigger);
        String result = FINISH_RESULT_FAILED;
        FinishClaimState claimState = null;

        try {
            claimState = tryAcquireFinishClaim(roomId, normalizedTrigger);
            long claimResult = claimState.resultCode;

            if (claimResult == FINISH_CLAIM_RESULT_NOOP_NON_PLAYING) {
                String currentStatus = (String) redisTemplate.opsForValue()
                        .get(String.format(RedisKeyConst.GAME_STATUS, roomId));
                log.warn("⚠️ Cannot finish game {} - not in PLAYING state (current: {})", roomId, currentStatus);
                result = FINISH_RESULT_NOOP_NON_PLAYING;
                return;
            }

            if (claimResult == FINISH_CLAIM_RESULT_REJECTED) {
                meterRegistry.counter(METRIC_GAME_FINISH_CLAIM_REJECTED, "trigger", normalizedTrigger).increment();
                log.info("🚫 Finish claim rejected for game {} (trigger: {})", roomId, normalizedTrigger);
                result = FINISH_RESULT_CLAIM_REJECTED;
                return;
            }

            meterRegistry.counter(METRIC_GAME_FINISH_CLAIM_GRANTED, "trigger", normalizedTrigger).increment();
            if (claimState.isRecoveredFromStaleEnding()) {
                log.warn("♻️ Recovered stale ENDING finish claim for game {} (trigger: {})", roomId, normalizedTrigger);
            }
            log.info("🏁 Finishing game {} (trigger: {})", roomId, normalizedTrigger);

            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String teamType = (String) redisTemplate.opsForHash().get(infoKey, "teamType");
            String mode = (String) redisTemplate.opsForHash().get(infoKey, "mode");
            Object timeLimitObj = redisTemplate.opsForHash().get(infoKey, "timeLimit");
            int timeLimit = (timeLimitObj != null) ? Integer.parseInt(String.valueOf(timeLimitObj)) : 0;
            Object problemCountObj = redisTemplate.opsForHash().get(infoKey, "problemCount");
            int problemCount = (problemCountObj != null) ? Integer.parseInt(String.valueOf(problemCountObj)) : 0;

            if (problemCount == 0) {
                String problemsKey = String.format(RedisKeyConst.GAME_PROBLEMS, roomId);
                Long size = redisTemplate.opsForList().size(problemsKey);
                if (size != null) {
                    problemCount = size.intValue();
                }
            }

            Map<String, Double> teamRankingMap = new HashMap<>();
            String winner = null;

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
                    if (!teamSet.isEmpty()) {
                        winner = String.valueOf(teamSet.iterator().next().getValue());
                    }
                }
            } else if (rankingSet != null && !rankingSet.isEmpty()) {
                winner = String.valueOf(rankingSet.iterator().next().getValue());
            }

            Map<Long, Integer> gainedPointsMap = new HashMap<>();
            try {
                gainedPointsMap = gameService.processGameResult(roomId, winner, teamType, normalizedTrigger);
            } catch (Exception e) {
                log.error("❌ Failed to process game result for Game ID: {}", roomId, e);
            }

            if (rankingSet != null) {
                for (ZSetOperations.TypedTuple<Object> entry : rankingSet) {
                    Long uId = Long.parseLong(String.valueOf(entry.getValue()));
                    Double s = entry.getScore();

                    User user = userRepository.findById(uId).orElse(null);
                    String nickname = (user != null) ? user.getNickname() : "Unknown";
                    String league = (user != null) ? user.getLeague().name() : "STONE";
                    int currentExp = (user != null) ? user.getLeaguePoint() : 0;

                    String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
                    String tColor = (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(uId));

                    String scoreKey = String.format(RedisKeyConst.GAME_USER_SCORE, roomId, uId);
                    Object solvedCountObj = redisTemplate.opsForHash().get(scoreKey, "solvedCount");
                    int solvedCount = (solvedCountObj != null) ? Integer.parseInt(String.valueOf(solvedCountObj)) : 0;

                    Object lastSolvedObj = redisTemplate.opsForHash().get(scoreKey, "lastSolvedSeconds");
                    long lastSolvedSec = (lastSolvedObj != null) ? Long.parseLong(String.valueOf(lastSolvedObj)) : 0;
                    Long clearTime = lastSolvedSec;

                    String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, roomId);
                    String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);
                    long startTime = (startTimeStr != null) ? Long.parseLong(startTimeStr) : System.currentTimeMillis();
                    long totalDuration = (System.currentTimeMillis() - startTime) / 1000;

                    if ("TIME_ATTACK".equals(mode) && solvedCount < problemCount) {
                        clearTime = (long) timeLimit;
                    } else if ("SPEED_RACE".equals(mode) && solvedCount < problemCount) {
                        clearTime = null;
                    }

                    Map<String, Object> userRank = new HashMap<>();
                    userRank.put("userId", uId);
                    userRank.put("nickname", nickname);
                    userRank.put("score", s);
                    userRank.put("solvedCount", solvedCount);
                    userRank.put("teamColor", tColor);
                    userRank.put("clearTime", clearTime);
                    userRank.put("profileImg", (user != null) ? user.getProfileImg() : null);
                    userRank.put("league", league);
                    userRank.put("currentExp", currentExp);
                    userRank.put("gainedExp", gainedPointsMap.getOrDefault(uId, 0));
                    userRank.put("totalDuration", totalDuration);

                    rankingList.add(userRank);
                }
            }

            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
            Map<String, Object> endData = new HashMap<>();
            endData.put("status", "END");
            endData.put("ranking", rankingList);
            endData.put("teamRanking", teamRankingMap);

            Map<String, Integer> teamSolvedCounts = new HashMap<>();
            for (Map.Entry<String, Double> entry : teamRankingMap.entrySet()) {
                teamSolvedCounts.put(entry.getKey(), entry.getValue().intValue());
            }
            endData.put("teamSolvedCounts", teamSolvedCounts);
            endData.put("winner", winner);
            endData.put("teamType", teamType);

            updateGameStatusInternal(roomId, GameStatus.END);
            redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("GAME_END", endData));
            meterRegistry.counter(METRIC_GAME_FINISH_EVENT_PUBLISHED, "trigger", normalizedTrigger).increment();
            meterRegistry.counter(METRIC_GAME_FINISH_RESULT_PROCESSED, "trigger", normalizedTrigger).increment();

            String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
            Set<Object> players = redisTemplate.opsForSet().members(playersKey);
            if (players != null) {
                for (Object playerObj : players) {
                    Long playerId = Long.parseLong(String.valueOf(playerObj));
                    redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, playerId));
                }
            }

            redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));

            String inviteCode = (String) redisTemplate.opsForValue()
                    .get(String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId));
            if (inviteCode != null) {
                redisTemplate.delete(String.format(RedisKeyConst.GAME_INVITE_CODE, inviteCode));
                redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId));
            }

            redisTemplate.delete(String.format(RedisKeyConst.GAME_FINISH_TIMER, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_FINISH_CLAIM, roomId));

            log.info("🗑️ Cleaning up all Redis data for finished game {}", roomId);

            workbookPreviewCacheService.releaseRoomWorkbookCache(roomId);

            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INFO, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_STATUS, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_START_TIME, roomId));

            redisTemplate.delete(String.format(RedisKeyConst.GAME_RANKING, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_TEAM_RANKING, roomId));

            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_ONLINE, roomId));

            redisTemplate.delete(String.format(RedisKeyConst.GAME_PROBLEMS, roomId));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_PROBLEMS_PREVIEW, roomId));

            if (rankingSet != null) {
                for (ZSetOperations.TypedTuple<Object> entry : rankingSet) {
                    Long uId = Long.parseLong(String.valueOf(entry.getValue()));
                    redisTemplate.delete(String.format(RedisKeyConst.GAME_USER_SCORE, roomId, uId));
                }
            }

            log.info("✅ Game {} finished and cleaned up successfully. Winner: {}", roomId, winner);
            result = FINISH_RESULT_PROCESSED;
        } catch (Exception e) {
            rollbackFinishClaim(roomId, claimState);
            log.error("❌ Failed to finish game {} (trigger: {})", roomId, normalizedTrigger, e);
            throw e;
        } finally {
            recordFinishGameMetrics(timerSample, normalizedTrigger, result, sqlSnapshot);
        }
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

    /**
     * 초대 코드 생성 및 저장 (TTL 10분)
     */
    public String generateInviteCode(Long roomId) {
        // 1. 기존 코드가 있는지 확인
        String oldCode = (String) redisTemplate.opsForValue()
                .get(String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId));
        if (oldCode != null) {
            redisTemplate.delete(String.format(RedisKeyConst.GAME_INVITE_CODE, oldCode));
        }

        // 2. 새 코드 생성
        String newCode = createRandomCode();

        // 3. 코드 -> RoomId 저장
        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.GAME_INVITE_CODE, newCode),
                String.valueOf(roomId),
                10, TimeUnit.MINUTES);

        // 4. RoomId -> 코드 저장
        redisTemplate.opsForValue().set(
                String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId),
                newCode,
                10, TimeUnit.MINUTES);

        return newCode;
    }

    /**
     * 초대 코드로 방 ID 조회
     */
    public Long getRoomIdByInviteCode(String code) {
        String roomIdStr = (String) redisTemplate.opsForValue()
                .get(String.format(RedisKeyConst.GAME_INVITE_CODE, code));
        if (roomIdStr == null) {
            return null;
        }
        return Long.parseLong(roomIdStr);
    }

    /**
     * 8자리 랜덤 대문자+숫자 코드 생성
     */
    private String createRandomCode() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(8);
        SecureRandom random = new SecureRandom();
        for (int i = 0; i < 8; i++) {
            sb.append(characters.charAt(random.nextInt(characters.length())));
        }
        return sb.toString();
    }

    /**
     * 현재 유저가 참여 중인 게임 정보 조회
     * 재접속 모달을 위한 메서드
     */
    public CurrentGameResponse getUserCurrentGame(Long userId) {
        Long gameId = getUserCurrentGameId(userId);
        if (gameId == null) {
            return null;
        }

        try {
            GameRoomResponse room = getGameRoom(gameId);
            return CurrentGameResponse.builder()
                    .roomId(gameId)
                    .status(room.getStatus())
                    .title(room.getTitle())
                    .build();
        } catch (Exception e) {
            // 방이 삭제된 경우 USER_CURRENT_GAME 키 정리
            log.warn("Game room {} not found for user {}. Cleaning up stale reference.", gameId, userId);
            redisTemplate.delete(String.format(RedisKeyConst.USER_CURRENT_GAME, userId));
            return null;
        }
    }

    public Map<String, Object> reserveRoomSlot(Long roomId, Long userId) {
        String lockKey = String.format(RedisKeyConst.LOCK_GAME_RESERVE, roomId);
        RLock lock = redissonClient.getLock(lockKey);

        try {
            if (!lock.tryLock(500, 1000, TimeUnit.MILLISECONDS)) {
                // Lock acquisition failed - likely due to high concurrency or room is full
                log.warn("⚠️ Failed to acquire lock for Room {} reservation by User {}", roomId, userId);
                throw new com.peekle.global.exception.BusinessException(
                        com.peekle.global.exception.ErrorCode.GAME_ROOM_FULL);
            }

            // 1. Check if user already in room
            String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
            boolean isInRoom = Boolean.TRUE.equals(
                    redisTemplate.opsForSet().isMember(playersKey, String.valueOf(userId)));

            if (isInRoom) {
                return Map.of("success", true, "status", "ALREADY_IN_ROOM", "ttl", 0);
            }

            // 2. Check if user has existing reservation
            String reservationKey = String.format(RedisKeyConst.GAME_ROOM_RESERVATION, roomId, userId);
            Boolean hasReservation = redisTemplate.hasKey(reservationKey);

            if (Boolean.TRUE.equals(hasReservation)) {
                // Extend TTL
                redisTemplate.expire(reservationKey, 30, TimeUnit.SECONDS);
                return Map.of("success", true, "status", "EXTENDED", "ttl", 30);
            }

            // 3. Check room capacity (current players + reservations)
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            String maxPlayersStr = (String) redisTemplate.opsForHash().get(infoKey, "maxPlayers");
            int maxPlayers = Integer.parseInt(maxPlayersStr != null ? maxPlayersStr : "8");

            Long currentPlayers = redisTemplate.opsForSet().size(playersKey);
            int currentCount = currentPlayers != null ? currentPlayers.intValue() : 0;

            String countKey = String.format(RedisKeyConst.GAME_ROOM_RESERVED_COUNT, roomId);
            Object reservedCountObj = redisTemplate.opsForValue().get(countKey);
            int reservedCount = 0;
            if (reservedCountObj != null) {
                if (reservedCountObj instanceof Integer) {
                    reservedCount = (Integer) reservedCountObj;
                } else if (reservedCountObj instanceof Long) {
                    reservedCount = ((Long) reservedCountObj).intValue();
                } else if (reservedCountObj instanceof String) {
                    reservedCount = Integer.parseInt((String) reservedCountObj);
                }
            }

            if (currentCount + reservedCount >= maxPlayers) {
                throw new com.peekle.global.exception.BusinessException(
                        com.peekle.global.exception.ErrorCode.GAME_ROOM_FULL);
            }

            // 4. Create reservation
            redisTemplate.opsForValue().set(reservationKey, "RESERVED", 30, TimeUnit.SECONDS);

            // 5. Increment reserved counter
            redisTemplate.opsForValue().increment(countKey);
            redisTemplate.expire(countKey, 60, TimeUnit.SECONDS);

            // 6. Broadcast logic removed from here as we don't treat reserved users as
            // fully joined yet
            // The lobby will update when they confirm and enter

            // Broadcast player count update to lobby (Optional: if we want to show reserved
            // usage? maybe not)
            // For now, let's NOT broadcast lobby update on reserve, only on confirm.
            // But to keep behavior consistent, we can just log.

            currentPlayers = redisTemplate.opsForSet().size(playersKey);
            int playerCount = currentPlayers != null ? currentPlayers.intValue() : 0;

            log.info("🎫 User {} reserved slot in Room {} - currentPlayers: {} (Reserved count increased)", userId,
                    roomId, playerCount);
            return Map.of("success", true, "status", "RESERVED", "ttl", 30);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new com.peekle.global.exception.BusinessException(
                    com.peekle.global.exception.ErrorCode.INTERNAL_SERVER_ERROR);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * Confirm reservation and enter room (called when clicking "확인" button)
     * If reservation exists, use it; otherwise try atomic entry
     */
    public void confirmReservation(Long roomId, Long userId, String password) {
        String lockKey = String.format(RedisKeyConst.LOCK_GAME_CONFIRM, roomId);
        RLock lock = redissonClient.getLock(lockKey);

        try {
            if (!lock.tryLock(500, 1000, TimeUnit.MILLISECONDS)) {
                log.warn("⚠️ Failed to acquire lock for Room {} confirmation by User {}", roomId, userId);
                throw new com.peekle.global.exception.BusinessException(
                        com.peekle.global.exception.ErrorCode.GAME_ROOM_FULL);
            }

            String reservationKey = String.format(RedisKeyConst.GAME_ROOM_RESERVATION, roomId, userId);
            Boolean hasReservation = redisTemplate.hasKey(reservationKey);

            if (Boolean.TRUE.equals(hasReservation)) {
                // Reservation valid: Delete reservation and enter
                deleteReservation(roomId, userId);
                log.info("✅ User {} confirmed reservation for Room {}", userId, roomId);
                enterGameRoom(roomId, userId, password);
            } else {
                // Reservation expired or never existed: Try atomic entry
                log.warn("⏰ Reservation expired for User {} in Room {}. Attempting direct entry.", userId, roomId);

                // Check capacity one more time
                String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
                String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
                String maxPlayersStr = (String) redisTemplate.opsForHash().get(infoKey, "maxPlayers");
                int maxPlayers = Integer.parseInt(maxPlayersStr != null ? maxPlayersStr : "8");

                Long currentPlayers = redisTemplate.opsForSet().size(playersKey);
                int currentCount = currentPlayers != null ? currentPlayers.intValue() : 0;

                if (currentCount >= maxPlayers) {
                    throw new com.peekle.global.exception.BusinessException(
                            com.peekle.global.exception.ErrorCode.GAME_ROOM_FULL);
                }

                enterGameRoom(roomId, userId, password);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new com.peekle.global.exception.BusinessException(
                    com.peekle.global.exception.ErrorCode.INTERNAL_SERVER_ERROR);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * Cancel reservation (called when prejoin modal closes without confirming)
     */
    public void cancelReservation(Long roomId, Long userId) {
        String reservationKey = String.format(RedisKeyConst.GAME_ROOM_RESERVATION, roomId, userId);
        Boolean hasReservation = redisTemplate.hasKey(reservationKey);

        if (Boolean.TRUE.equals(hasReservation)) {
            deleteReservation(roomId, userId);

            // No need to remove from players key or broadcast, as we didn't add them in
            // reserveRoomSlot
            log.info("❌ User {} cancelled reservation for Room {} (Reserved count decremented)", userId, roomId);
        }
    }

    /**
     * Helper method to delete reservation and decrement counter
     */
    private void deleteReservation(Long roomId, Long userId) {
        String reservationKey = String.format(RedisKeyConst.GAME_ROOM_RESERVATION, roomId, userId);
        redisTemplate.delete(reservationKey);

        String countKey = String.format(RedisKeyConst.GAME_ROOM_RESERVED_COUNT, roomId);
        Long remaining = redisTemplate.opsForValue().decrement(countKey);

        // Clean up counter if it reaches 0
        if (remaining != null && remaining <= 0) {
            redisTemplate.delete(countKey);
        }
    }

    /**
     * 방의 Team Type 조회 (INDIVIDUAL / TEAM)
     */
    public String getTeamType(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        return (String) redisTemplate.opsForHash().get(infoKey, "teamType");
    }

    /**
     * 유저의 소속 팀 조회 (RED / BLUE)
     */
    public String getUserTeam(Long roomId, Long userId) {
        String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId);
        return (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(userId));
    }

}
