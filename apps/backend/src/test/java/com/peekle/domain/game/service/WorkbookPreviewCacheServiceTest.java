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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkbookPreviewCacheServiceTest {

    private static final String WORKBOOK_UPDATED_AT = "2026-04-29T10:00";

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
    void prepareWorkbookPreviewBuildsSharedCacheAndStartSnapshotMetadata() {
        Long roomId = 42L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        String previewIdsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId);
        String snapshotKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId);
        String snapshotMetaKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        String refKey = String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, workbookId);
        Workbook workbook = workbook(workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(roomInfo(workbookId));
        when(hashOperations.entries(cacheInfoKey)).thenReturn(Collections.emptyMap());
        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));
        when(workbookProblemRepository.findByWorkbookWithProblem(workbook)).thenReturn(List.of(
                workbookProblem(workbook, problem(1001L), 0),
                workbookProblem(workbook, problem(1002L), 1)));
        when(setOperations.distinctRandomMembers(idsKey, 2)).thenReturn(Set.of("1001", "1002"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(1001L),
                previewProblem(1002L)));

        workbookPreviewCacheService.prepareWorkbookPreview(roomId, 2);

        verify(setOperations).add(eq(idsKey), any(Object[].class));
        verify(listOperations).rightPushAll(eq(previewIdsKey), any(Object[].class));
        verify(redisTemplate).delete(snapshotKey);
        verify(listOperations).rightPushAll(eq(snapshotKey), any(Object[].class));
        verify(hashOperations).putAll(eq(snapshotMetaKey), any(Map.class));
        verify(valueOperations).increment(refKey);
        verify(setOperations, never()).members(idsKey);
        verify(workbookLock).unlock();

        ArgumentCaptor<Map<String, String>> roomInfoCaptor = ArgumentCaptor.forClass(Map.class);
        verify(hashOperations).putAll(eq(roomInfoKey), roomInfoCaptor.capture());
        Map<String, String> roomUpdates = roomInfoCaptor.getValue();
        Assertions.assertEquals("true", roomUpdates.get(WorkbookPreviewCacheService.PREVIEW_READY_FIELD));
        Assertions.assertEquals("2", roomUpdates.get(WorkbookPreviewCacheService.PREVIEW_COUNT_FIELD));
        Assertions.assertEquals("Workbook", roomUpdates.get("workbookTitle"));
        Assertions.assertEquals(WORKBOOK_UPDATED_AT,
                roomUpdates.get(WorkbookPreviewCacheService.START_SNAPSHOT_WORKBOOK_UPDATED_AT_FIELD));

        Assertions.assertEquals(1L,
                meterRegistry.find("redis.workbook.cache.bytes_per_workbook").summary().count());
        Assertions.assertEquals(1L,
                meterRegistry.find("redis.preview.bytes_per_room").summary().count());
    }

    @Test
    void selectProblemsForStartUsesSnapshotFirstWithoutRerollingAndPreservesOrder() {
        Long roomId = 7L;
        Long workbookId = 3L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String snapshotKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId);
        String snapshotMetaKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        Map<Object, Object> roomInfo = roomInfo(workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(roomInfo);
        when(hashOperations.entries(snapshotMetaKey)).thenReturn(snapshotMetadata(roomId, workbookId, 2, roomInfo));
        when(listOperations.range(snapshotKey, 0, 1)).thenReturn(List.of(
                previewProblem(11L),
                previewProblem(10L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("snapshot_hit", selection.cacheStatus());
        Assertions.assertEquals(List.of(11L, 10L), selection.problems().stream().map(Problem::getId).toList());
        Assertions.assertEquals(2, distinctProblemIds(selection.problems()).size());
        verify(setOperations, never()).distinctRandomMembers(any(), anyLong());
        verifyNoInteractions(workbookRepository, workbookProblemRepository);
        Assertions.assertEquals(1.0, meterRegistry.get("game.start.snapshot.result")
                .tag("result", "hit")
                .counter()
                .count());
    }

    @Test
    void selectProblemsForStartRegeneratesSnapshotOnMissAndRecordsFallback() {
        Long roomId = 99L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String snapshotMetaKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(roomInfo(workbookId));
        when(hashOperations.entries(snapshotMetaKey)).thenReturn(Collections.emptyMap());
        mockReadyWorkbookCache(cacheInfoKey, workbookId, 3);
        when(setOperations.distinctRandomMembers(idsKey, 2)).thenReturn(Set.of("10", "11"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(10L),
                previewProblem(11L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("snapshot_miss_fallback", selection.cacheStatus());
        Assertions.assertEquals(2, selection.problems().size());
        Assertions.assertEquals(2, distinctProblemIds(selection.problems()).size());
        Assertions.assertEquals(1.0, meterRegistry.get("game.start.fallback.used")
                .tag("reason", "miss")
                .counter()
                .count());
    }

    @Test
    void selectProblemsForStartTreatsMetadataMismatchAsStale() {
        Long roomId = 100L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String snapshotMetaKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        Map<Object, Object> roomInfo = roomInfo(workbookId);
        Map<Object, Object> staleMetadata = snapshotMetadata(roomId, workbookId, 5, roomInfo);

        when(hashOperations.entries(roomInfoKey)).thenReturn(roomInfo);
        when(hashOperations.entries(snapshotMetaKey)).thenReturn(staleMetadata);
        mockReadyWorkbookCache(cacheInfoKey, workbookId, 3);
        when(setOperations.distinctRandomMembers(idsKey, 2)).thenReturn(Set.of("10", "11"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(10L),
                previewProblem(11L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("snapshot_stale_fallback", selection.cacheStatus());
        Assertions.assertEquals(1.0, meterRegistry.get("game.start.snapshot.result")
                .tag("result", "stale")
                .counter()
                .count());
    }

    @Test
    void selectProblemsForStartTreatsDuplicateSnapshotAsStaleAndFallbackKeepsDistinctProblems() {
        Long roomId = 101L;
        Long workbookId = 1L;
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String snapshotKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId);
        String snapshotMetaKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        Map<Object, Object> roomInfo = roomInfo(workbookId);

        when(hashOperations.entries(roomInfoKey)).thenReturn(roomInfo);
        when(hashOperations.entries(snapshotMetaKey)).thenReturn(snapshotMetadata(roomId, workbookId, 2, roomInfo));
        when(listOperations.range(snapshotKey, 0, 1)).thenReturn(List.of(
                previewProblem(10L),
                previewProblem(10L)));
        mockReadyWorkbookCache(cacheInfoKey, workbookId, 3);
        when(setOperations.distinctRandomMembers(idsKey, 2)).thenReturn(Set.of("10", "11"));
        when(hashOperations.multiGet(eq(metaKey), any())).thenReturn(List.of(
                previewProblem(10L),
                previewProblem(11L)));

        WorkbookPreviewCacheService.WorkbookProblemSelection selection =
                workbookPreviewCacheService.selectProblemsForStart(roomId, 2);

        Assertions.assertEquals("snapshot_stale_fallback", selection.cacheStatus());
        Assertions.assertEquals(2, distinctProblemIds(selection.problems()).size());
    }

    @Test
    void invalidateWorkbookCacheAndStartSnapshotsDeletesIndexedWaitingRoomSnapshots() {
        Long workbookId = 5L;
        Long roomId = 30L;
        String roomIndexKey = String.format(RedisKeyConst.WORKBOOK_START_SNAPSHOT_ROOM_IDS, workbookId);
        String roomInfoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);

        when(setOperations.members(roomIndexKey)).thenReturn(Set.of(String.valueOf(roomId)));

        workbookPreviewCacheService.invalidateWorkbookCacheAndStartSnapshots(workbookId);

        verify(redisTemplate).delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId));
        verify(redisTemplate).delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId));
        verify(redisTemplate).delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId));
        verify(redisTemplate).delete(String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId));
        verify(redisTemplate).delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId));
        verify(redisTemplate).delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId));
        verify(redisTemplate).delete(roomIndexKey);
        verify(hashOperations).put(roomInfoKey, WorkbookPreviewCacheService.PREVIEW_READY_FIELD, "false");
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

    private void mockReadyWorkbookCache(String cacheInfoKey, Long workbookId, int count) {
        when(hashOperations.entries(cacheInfoKey)).thenReturn(Map.of(
                "ready", "true",
                "count", String.valueOf(count),
                "workbookTitle", "Workbook",
                "previewBytes", "10",
                "cachedAt", "1234",
                "workbookUpdatedAt", WORKBOOK_UPDATED_AT));
        when(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId))).thenReturn(true);
        when(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId))).thenReturn(true);
        when(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId))).thenReturn(true);
    }

    private static Workbook workbook(Long id) {
        return Workbook.builder()
                .id(id)
                .title("Workbook")
                .createdAt(LocalDateTime.parse(WORKBOOK_UPDATED_AT))
                .updatedAt(LocalDateTime.parse(WORKBOOK_UPDATED_AT))
                .build();
    }

    private static Map<Object, Object> roomInfo(Long workbookId) {
        return Map.of(
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId),
                "problemCount", "2",
                "teamType", "INDIVIDUAL",
                "mode", "TIME_ATTACK",
                "timeLimit", "300",
                WorkbookPreviewCacheService.START_SNAPSHOT_WORKBOOK_UPDATED_AT_FIELD, WORKBOOK_UPDATED_AT);
    }

    private static Map<Object, Object> snapshotMetadata(
            Long roomId,
            Long workbookId,
            int problemCount,
            Map<Object, Object> roomInfo) {
        return Map.of(
                "roomId", String.valueOf(roomId),
                "workbookId", String.valueOf(workbookId),
                "problemCount", String.valueOf(problemCount),
                "selectionFilterHash", selectionFilterHash(roomInfo, workbookId, problemCount),
                "roomSettingVersion", roomSettingVersion(roomInfo),
                "workbookUpdatedAt", WORKBOOK_UPDATED_AT,
                "generatedAt", "1234",
                "snapshotId", "snapshot-1");
    }

    private static String selectionFilterHash(Map<Object, Object> roomInfo, Long workbookId, int problemCount) {
        return sha256(String.join("|",
                "problemSource=" + roomInfo.getOrDefault("problemSource", "WORKBOOK"),
                "workbookId=" + workbookId,
                "problemCount=" + problemCount,
                "tierMin=" + roomInfo.getOrDefault("tierMin", ""),
                "tierMax=" + roomInfo.getOrDefault("tierMax", ""),
                "tags="));
    }

    private static String roomSettingVersion(Map<Object, Object> roomInfo) {
        return sha256(String.join("|",
                "teamType=" + roomInfo.getOrDefault("teamType", ""),
                "mode=" + roomInfo.getOrDefault("mode", ""),
                "timeLimit=" + roomInfo.getOrDefault("timeLimit", "")));
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashed.length * 2);
            for (byte b : hashed) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
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
