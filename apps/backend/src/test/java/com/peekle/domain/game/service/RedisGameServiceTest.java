package com.peekle.domain.game.service;

import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.DefaultTypedTuple;

import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisGameServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private RedisPublisher redisPublisher;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private GameService gameService;
    @Mock
    private GameFinishClaimService gameFinishClaimService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProblemRepository problemRepository;
    @Mock
    private WorkbookRepository workbookRepository;
    @Mock
    private WorkbookProblemRepository workbookProblemRepository;
    @Mock
    private RedisGameWaitService waitService;
    @Mock
    private RedisGameRoomManager roomManager;
    @Mock
    private WorkbookPreviewCacheService workbookPreviewCacheService;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;
    @Mock
    private SetOperations<String, Object> setOperations;
    @Mock
    private ListOperations<String, Object> listOperations;
    @Mock
    private ZSetOperations<String, Object> zSetOperations;
    @Mock
    private RLock statusLock;

    private RedisGameService redisGameService;

    @BeforeEach
    void setUp() throws InterruptedException {
        redisGameService = new RedisGameService(
                redisTemplate,
                redisPublisher,
                redissonClient,
                gameService,
                gameFinishClaimService,
                userRepository,
                problemRepository,
                workbookRepository,
                workbookProblemRepository,
                waitService,
                roomManager,
                workbookPreviewCacheService,
                new SimpleMeterRegistry(),
                Optional.empty(),
                Optional.empty());

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        lenient().when(redisTemplate.opsForSet()).thenReturn(setOperations);
        lenient().when(redisTemplate.opsForList()).thenReturn(listOperations);
        lenient().when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        lenient().when(redissonClient.getLock(any(String.class))).thenReturn(statusLock);
        lenient().when(statusLock.tryLock(anyLong(), anyLong(), any())).thenReturn(true);
        lenient().when(statusLock.isHeldByCurrentThread()).thenReturn(true);
    }

    @Test
    void finishGameProcessesOnlyWhenDbFinishClaimIsGranted() {
        Long roomId = 77L;
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, roomId);
        String inviteCodeKey = String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId);

        when(valueOperations.get(statusKey)).thenReturn(GameStatus.PLAYING.name(), GameStatus.ENDING.name());
        when(valueOperations.get(startTimeKey)).thenReturn(String.valueOf(System.currentTimeMillis()));
        when(valueOperations.get(inviteCodeKey)).thenReturn(null);
        when(gameFinishClaimService.tryAcquire(roomId, "manual"))
                .thenReturn(new GameFinishClaimService.FinishClaim(true, "manual:test-token"));
        when(hashOperations.get(infoKey, "teamType")).thenReturn("INDIVIDUAL");
        when(hashOperations.get(infoKey, "mode")).thenReturn("SPEED_RACE");
        when(hashOperations.get(infoKey, "timeLimit")).thenReturn("0");
        when(hashOperations.get(infoKey, "problemCount")).thenReturn("1");
        when(zSetOperations.reverseRangeWithScores(rankingKey, 0, -1))
                .thenReturn(Set.of(new DefaultTypedTuple<>("1", 100.0)));
        when(gameService.processGameResult(roomId, "1", "INDIVIDUAL", "manual"))
                .thenReturn(Map.of(1L, 10));
        when(setOperations.members(playersKey)).thenReturn(Set.of("1"));

        redisGameService.finishGame(roomId);

        verify(gameService).processGameResult(roomId, "1", "INDIVIDUAL", "manual");
        InOrder order = inOrder(gameFinishClaimService, redisPublisher);
        order.verify(gameFinishClaimService).tryAcquire(roomId, "manual");
        order.verify(gameFinishClaimService).markCompleted(roomId, "manual:test-token");
        order.verify(redisPublisher, times(3)).publish(any(), any());
    }

    @Test
    void finishGameSkipsSettlementWhenDbFinishClaimIsRejected() {
        Long roomId = 77L;
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);

        when(valueOperations.get(statusKey)).thenReturn(GameStatus.PLAYING.name());
        when(gameFinishClaimService.tryAcquire(roomId, "manual"))
                .thenReturn(new GameFinishClaimService.FinishClaim(false, "manual:loser-token"));

        redisGameService.finishGame(roomId);

        verify(gameFinishClaimService).tryAcquire(roomId, "manual");
        verifyNoInteractions(gameService);
        verifyNoInteractions(redisPublisher);
        verify(gameFinishClaimService, never()).markCompleted(any(), any());
    }

    @Test
    void finishGameRollsBackClaimAndDoesNotPublishWhenSettlementFails() {
        Long roomId = 77L;
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);

        when(valueOperations.get(statusKey)).thenReturn(GameStatus.PLAYING.name(), GameStatus.ENDING.name());
        when(gameFinishClaimService.tryAcquire(roomId, "manual"))
                .thenReturn(new GameFinishClaimService.FinishClaim(true, "manual:test-token"));
        when(gameFinishClaimService.rollback(roomId, "manual:test-token")).thenReturn(true);
        when(hashOperations.get(infoKey, "teamType")).thenReturn("INDIVIDUAL");
        when(hashOperations.get(infoKey, "mode")).thenReturn("SPEED_RACE");
        when(hashOperations.get(infoKey, "timeLimit")).thenReturn("0");
        when(hashOperations.get(infoKey, "problemCount")).thenReturn("1");
        when(zSetOperations.reverseRangeWithScores(rankingKey, 0, -1))
                .thenReturn(Set.of(new DefaultTypedTuple<>("1", 100.0)));
        when(gameService.processGameResult(roomId, "1", "INDIVIDUAL", "manual"))
                .thenThrow(new IllegalStateException("settlement failed"));

        assertThrows(IllegalStateException.class, () -> redisGameService.finishGame(roomId));

        verify(gameFinishClaimService).rollback(roomId, "manual:test-token");
        verify(gameFinishClaimService, never()).markCompleted(any(), any());
        verify(redisPublisher, never()).publish(any(), any());
    }

    @Test
    void startGameForWorkbookUsesSnapshotSelectionServiceAndDoesNotQueryDbProblemSelection() {
        Long roomId = 77L;
        Long userId = 1L;
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);

        when(hashOperations.multiGet(eq(infoKey), eq(List.of("problemSource", "hostId", "teamType", "problemCount"))))
                .thenReturn(List.of("WORKBOOK", String.valueOf(userId), "INDIVIDUAL", "2"));
        when(valueOperations.get(statusKey)).thenReturn(GameStatus.WAITING.name());
        when(setOperations.members(playersKey)).thenReturn(Set.of(String.valueOf(userId)));
        when(hashOperations.multiGet(eq(readyKey), any())).thenReturn(List.of("true"));
        when(workbookPreviewCacheService.selectProblemsForStart(roomId, 2))
                .thenReturn(new WorkbookPreviewCacheService.WorkbookProblemSelection(
                        List.of(problem(10L), problem(11L)),
                        "snapshot_hit"));
        redisGameService.startGame(roomId, userId);

        verify(workbookPreviewCacheService).selectProblemsForStart(roomId, 2);
        verifyNoInteractions(problemRepository, workbookRepository, workbookProblemRepository);
    }

    private static Problem problem(Long id) {
        return Problem.builder()
                .id(id)
                .externalId(String.valueOf(id))
                .title("problem-" + id)
                .tier("Gold 5")
                .url("https://example.com/problems/" + id)
                .build();
    }
}
