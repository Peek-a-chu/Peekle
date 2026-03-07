package com.peekle.domain.game.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.redis.RedisKeyConst;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkbookPreviewCacheServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private WorkbookRepository workbookRepository;
    @Mock
    private WorkbookProblemRepository workbookProblemRepository;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;
    @Mock
    private ListOperations<String, Object> listOperations;
    @Mock
    private SetOperations<String, Object> setOperations;
    @Mock
    private RLock workbookLock;

    private SimpleMeterRegistry meterRegistry;
    private WorkbookPreviewCacheService workbookPreviewCacheService;

    @BeforeEach
    void setUp() throws InterruptedException {
        meterRegistry = new SimpleMeterRegistry();
        workbookPreviewCacheService = new WorkbookPreviewCacheService(
                redisTemplate,
                redissonClient,
                workbookRepository,
                workbookProblemRepository,
                meterRegistry);

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        lenient().when(redisTemplate.opsForList()).thenReturn(listOperations);
        lenient().when(redisTemplate.opsForSet()).thenReturn(setOperations);
        lenient().when(redissonClient.getLock(any(String.class))).thenReturn(workbookLock);
        lenient().when(workbookLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        lenient().when(workbookLock.isHeldByCurrentThread()).thenReturn(true);
    }

    @Test
    void prepareWorkbookPreviewBuildsSharedWorkbookCacheAndRegistersRoomWithoutReloadingAllProblems() {
        Long roomId = 42L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String previewIdsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId);
        String refKey = String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, workbookId);
        Workbook workbook = Workbook.builder().id(workbookId).title("Workbook").build();

        when(hashOperations.entries(roomInfoKey)).thenReturn(Map.of(
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId)));
        when(hashOperations.entries(cacheInfoKey)).thenReturn(Collections.emptyMap());
        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));
        when(workbookProblemRepository.findByWorkbookWithProblem(workbook)).thenReturn(List.of(
                workbookProblem(workbook, problem(1001L), 0),
                workbookProblem(workbook, problem(1002L), 1)));

        workbookPreviewCacheService.prepareWorkbookPreview(roomId, 2);

        verify(setOperations).add(eq(idsKey), any(Object[].class));
        verify(listOperations).rightPushAll(eq(previewIdsKey), any(Object[].class));
        verify(valueOperations).increment(refKey);
        verify(setOperations, never()).members(idsKey);
        verify(hashOperations, never()).multiGet(any(), any());
        verify(workbookLock).unlock();

        ArgumentCaptor<Map<String, String>> roomInfoCaptor = ArgumentCaptor.forClass(Map.class);
        verify(hashOperations).putAll(eq(roomInfoKey), roomInfoCaptor.capture());
        Map<String, String> roomUpdates = roomInfoCaptor.getValue();
        Assertions.assertEquals("true", roomUpdates.get(WorkbookPreviewCacheService.PREVIEW_READY_FIELD));
        Assertions.assertEquals("2", roomUpdates.get(WorkbookPreviewCacheService.PREVIEW_COUNT_FIELD));
        Assertions.assertEquals("Workbook", roomUpdates.get("workbookTitle"));

        Assertions.assertEquals(1L,
                meterRegistry.find("redis.workbook.cache.bytes_per_workbook").summary().count());
        Assertions.assertEquals(1L,
                meterRegistry.find("redis.preview.bytes_per_room").summary().count());
    }

    @Test
    void selectProblemsForStartUsesSharedWorkbookCacheOnHit() {
        Long roomId = 7L;
        Long workbookId = 3L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(Map.of(
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId)));
        when(setOperations.distinctRandomMembers(idsKey, 2)).thenReturn(Set.of("1", "2"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(1L),
                previewProblem(2L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("hit", selection.cacheStatus());
        Assertions.assertEquals(2, selection.problems().size());
        Assertions.assertEquals(2, distinctProblemIds(selection.problems()).size());
        verifyNoInteractions(workbookRepository, workbookProblemRepository);
    }

    @Test
    void selectProblemsForStartRebuildsSharedCacheOnMiss() {
        Long roomId = 99L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        Workbook workbook = Workbook.builder().id(workbookId).title("Workbook").build();

        when(hashOperations.entries(roomInfoKey)).thenReturn(Map.of(
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId),
                "problemCount", "2"));
        when(setOperations.distinctRandomMembers(idsKey, 2))
                .thenReturn(Collections.emptySet())
                .thenReturn(Set.of("10", "11"));
        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));
        when(workbookProblemRepository.findByWorkbookWithProblem(workbook)).thenReturn(List.of(
                workbookProblem(workbook, problem(10L), 0),
                workbookProblem(workbook, problem(11L), 1),
                workbookProblem(workbook, problem(12L), 2)));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(10L),
                previewProblem(11L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("fallback", selection.cacheStatus());
        Assertions.assertEquals(2, selection.problems().size());
        verify(hashOperations).put(roomInfoKey, WorkbookPreviewCacheService.PREVIEW_READY_FIELD, "false");
        Assertions.assertEquals(1.0, meterRegistry.get("game.start.preview.miss").counter().count());
        Assertions.assertEquals(1.0, meterRegistry.get("game.start.preview.rebuild").counter().count());
    }

    @Test
    void loadPreviewProblemsReadsSharedPreviewSliceInsteadOfFullWorkbookList() {
        Long roomId = 15L;
        Long workbookId = 9L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String previewIdsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(Map.of(
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId)));
        when(listOperations.range(previewIdsKey, 0, -1)).thenReturn(List.of("21", "22", "23"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(21L),
                previewProblem(22L),
                previewProblem(23L)));

        List<Problem> previewProblems = workbookPreviewCacheService.loadPreviewProblems(roomId);

        Assertions.assertEquals(3, previewProblems.size());
        verify(listOperations).range(previewIdsKey, 0, -1);
        verify(setOperations, never()).members(any());
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

    private static WorkbookProblem workbookProblem(Workbook workbook, Problem problem, int orderIndex) {
        return WorkbookProblem.builder()
                .workbook(workbook)
                .problem(problem)
                .orderIndex(orderIndex)
                .build();
    }

    private static Map<String, String> previewProblem(Long id) {
        return Map.of(
                "id", String.valueOf(id),
                "externalId", String.valueOf(id),
                "title", "problem-" + id,
                "tier", "Gold 5",
                "url", "https://example.com/problems/" + id);
    }

    private static Set<Long> distinctProblemIds(List<Problem> problems) {
        return problems.stream()
                .map(Problem::getId)
                .collect(Collectors.toSet());
    }
}
