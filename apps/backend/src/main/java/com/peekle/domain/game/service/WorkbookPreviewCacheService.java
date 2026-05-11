package com.peekle.domain.game.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkbookPreviewCacheService {

    public static final String PREVIEW_READY_FIELD = "previewReady";
    public static final String PREVIEW_COUNT_FIELD = "previewCount";
    public static final String PREVIEW_CACHED_AT_FIELD = "previewCachedAt";
    public static final String WORKBOOK_CACHE_REGISTERED_FIELD = "workbookCacheRegistered";
    public static final String START_SNAPSHOT_WORKBOOK_UPDATED_AT_FIELD = "startSnapshotWorkbookUpdatedAt";

    private static final String WORKBOOK_CACHE_READY_FIELD = "ready";
    private static final String WORKBOOK_CACHE_COUNT_FIELD = "count";
    private static final String WORKBOOK_CACHE_TITLE_FIELD = "workbookTitle";
    private static final String WORKBOOK_CACHE_PREVIEW_BYTES_FIELD = "previewBytes";
    private static final String WORKBOOK_CACHE_CACHED_AT_FIELD = "cachedAt";
    private static final String WORKBOOK_CACHE_UPDATED_AT_FIELD = "workbookUpdatedAt";
    private static final String METRIC_GAME_START_PREVIEW_MISS = "game.start.preview.miss";
    private static final String METRIC_GAME_START_PREVIEW_REBUILD = "game.start.preview.rebuild";
    private static final String METRIC_GAME_START_PREVIEW_ROOM_SNAPSHOT_FALLBACK =
            "game.start.preview.room_snapshot_fallback";
    private static final String METRIC_GAME_START_SNAPSHOT_FETCH = "game.start.snapshot.fetch.ms";
    private static final String METRIC_GAME_START_SNAPSHOT_RESULT = "game.start.snapshot.result";
    private static final String METRIC_GAME_START_FALLBACK_USED = "game.start.fallback.used";
    private static final String METRIC_REDIS_PREVIEW_BYTES = "redis.preview.bytes_per_room";
    private static final String METRIC_REDIS_WORKBOOK_CACHE_BYTES = "redis.workbook.cache.bytes_per_workbook";
    private static final String SNAPSHOT_RESULT_HIT = "hit";
    private static final String SNAPSHOT_RESULT_MISS = "miss";
    private static final String SNAPSHOT_RESULT_STALE = "stale";
    private static final String CACHE_STATUS_SNAPSHOT_HIT = "snapshot_hit";
    private static final String CACHE_STATUS_SNAPSHOT_MISS_FALLBACK = "snapshot_miss_fallback";
    private static final String CACHE_STATUS_SNAPSHOT_STALE_FALLBACK = "snapshot_stale_fallback";
    private static final int WAITING_ROOM_PREVIEW_LIMIT = 10;
    private static final int SNAPSHOT_TTL_HOURS = 6;

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedissonClient redissonClient;
    private final WorkbookRepository workbookRepository;
    private final WorkbookProblemRepository workbookProblemRepository;
    private final MeterRegistry meterRegistry;

    public void prepareWorkbookPreview(Long roomId, int requestedProblemCount) {
        Map<Object, Object> roomInfo = loadRoomInfo(roomId);
        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));
        WorkbookCacheSnapshot snapshot = ensureWorkbookCache(workbookId, requestedProblemCount, false);
        registerRoomCacheUsage(roomId, roomInfo, snapshot);
        prepareRoomStartProblemSnapshot(roomId, roomInfo, snapshot, requestedProblemCount);
    }

    public WorkbookProblemSelection selectProblemsForStart(Long roomId, int problemCount) {
        Map<Object, Object> roomInfo = loadRoomInfo(roomId);
        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));

        long snapshotFetchStartedAtNanos = System.nanoTime();
        SnapshotLoadResult snapshotLoadResult = loadRoomStartProblemSnapshot(roomId, roomInfo, workbookId, problemCount);
        recordSnapshotFetch(snapshotLoadResult.result(), snapshotFetchStartedAtNanos);
        recordSnapshotResult(snapshotLoadResult.result());
        if (SNAPSHOT_RESULT_HIT.equals(snapshotLoadResult.result())) {
            return new WorkbookProblemSelection(snapshotLoadResult.problems(), CACHE_STATUS_SNAPSHOT_HIT);
        }

        markRoomPreviewUnavailable(roomId);
        meterRegistry.counter(METRIC_GAME_START_PREVIEW_MISS, "problem_source", "WORKBOOK").increment();
        meterRegistry.counter(METRIC_GAME_START_FALLBACK_USED,
                "problem_source", "WORKBOOK",
                "reason", snapshotLoadResult.result()).increment();

        WorkbookCacheSnapshot rebuilt = ensureWorkbookCache(workbookId, problemCount, false);
        registerRoomCacheUsage(roomId, roomInfo, rebuilt);
        meterRegistry.counter(METRIC_GAME_START_PREVIEW_REBUILD, "problem_source", "WORKBOOK").increment();

        List<Problem> rebuiltProblems = prepareRoomStartProblemSnapshot(roomId, roomInfo, rebuilt, problemCount);
        if (rebuiltProblems.isEmpty()) {
            WorkbookCacheSnapshot forceRebuilt = ensureWorkbookCache(workbookId, problemCount, true);
            registerRoomCacheUsage(roomId, roomInfo, forceRebuilt);
            rebuiltProblems = prepareRoomStartProblemSnapshot(roomId, roomInfo, forceRebuilt, problemCount);
        }
        if (rebuiltProblems.isEmpty()) {
            throw new BusinessException(ErrorCode.GAME_INVALID_ROOM_DATA, "문제집 캐시 복구에 실패했습니다.");
        }

        meterRegistry.counter(METRIC_GAME_START_PREVIEW_ROOM_SNAPSHOT_FALLBACK, "problem_source", "WORKBOOK")
                .increment();
        String cacheStatus = SNAPSHOT_RESULT_STALE.equals(snapshotLoadResult.result())
                ? CACHE_STATUS_SNAPSHOT_STALE_FALLBACK
                : CACHE_STATUS_SNAPSHOT_MISS_FALLBACK;
        return new WorkbookProblemSelection(rebuiltProblems, cacheStatus);
    }

    public List<Problem> loadPreviewProblems(Long roomId) {
        Map<Object, Object> roomInfo = loadRoomInfo(roomId);
        String problemSource = String.valueOf(roomInfo.getOrDefault("problemSource", "BOJ_RANDOM"));
        if (!"WORKBOOK".equals(problemSource)) {
            return Collections.emptyList();
        }

        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));
        List<Problem> previewProblems = loadPreviewProblemsFromCache(workbookId);
        if (!previewProblems.isEmpty()) {
            return previewProblems;
        }

        int requestedProblemCount = parseInt(roomInfo.getOrDefault("problemCount", "0"));
        WorkbookCacheSnapshot rebuilt = ensureWorkbookCache(workbookId, requestedProblemCount, true);
        registerRoomCacheUsage(roomId, roomInfo, rebuilt);
        return loadPreviewProblemsFromCache(workbookId);
    }

    public void evictWorkbookPreview(Long roomId) {
        Map<Object, Object> roomInfo = loadRoomInfo(roomId);
        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));

        RLock lock = getWorkbookCacheLock(workbookId);
        try {
            if (!lock.tryLock(2, 10, TimeUnit.SECONDS)) {
                log.info("🧹 [Workbook Cache] Eviction already in progress for workbook {}, skipping duplicate request", workbookId);
                return;
            }

            deleteWorkbookCacheKeys(workbookId);
            markRoomPreviewUnavailable(roomId);
            log.info("🧹 [Workbook Cache] Evicted shared workbook cache for workbook {} via room {}", workbookId, roomId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Workbook cache eviction interrupted", e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public void evictRoomStartProblemSnapshot(Long roomId) {
        Map<Object, Object> roomInfo = loadRoomInfo(roomId);
        if (!"WORKBOOK".equals(String.valueOf(roomInfo.getOrDefault("problemSource", "BOJ_RANDOM")))) {
            return;
        }

        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));
        deleteRoomStartProblemSnapshot(roomId, workbookId);
        log.info("🧹 [Workbook Cache] Evicted start problem snapshot for room {}", roomId);
    }

    public void invalidateWorkbookCacheAndStartSnapshots(Long workbookId) {
        RLock lock = getWorkbookCacheLock(workbookId);
        try {
            if (!lock.tryLock(2, 10, TimeUnit.SECONDS)) {
                log.warn("⚠️ [Workbook Cache] Could not acquire invalidation lock for workbook {}. Skipping.", workbookId);
                return;
            }

            deleteWorkbookCacheKeys(workbookId);
            redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, workbookId));

            String roomIndexKey = String.format(RedisKeyConst.WORKBOOK_START_SNAPSHOT_ROOM_IDS, workbookId);
            Set<Object> roomIds = redisTemplate.opsForSet().members(roomIndexKey);
            if (roomIds != null) {
                for (Object rawRoomId : roomIds) {
                    Long roomId = parseLongOrNull(rawRoomId);
                    if (roomId == null) {
                        continue;
                    }
                    redisTemplate.delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId));
                    redisTemplate.delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId));
                    markRoomPreviewUnavailable(roomId);
                }
            }
            redisTemplate.delete(roomIndexKey);
            log.info("🧹 [Workbook Cache] Invalidated cache and start snapshots for workbook {}", workbookId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Workbook cache invalidation interrupted", e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public void releaseRoomWorkbookCache(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);
        if (roomInfo.isEmpty()) {
            return;
        }

        if (!"WORKBOOK".equals(String.valueOf(roomInfo.getOrDefault("problemSource", "BOJ_RANDOM")))) {
            return;
        }

        if (!"true".equals(String.valueOf(roomInfo.getOrDefault(WORKBOOK_CACHE_REGISTERED_FIELD, "false")))) {
            return;
        }

        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));
        RLock lock = getWorkbookCacheLock(workbookId);
        try {
            if (!lock.tryLock(2, 10, TimeUnit.SECONDS)) {
                log.warn("⚠️ [Workbook Cache] Could not acquire release lock for workbook {} via room {}. Skipping cache release.",
                        workbookId, roomId);
                return;
            }

            Long remainingRefs = redisTemplate.opsForValue()
                    .decrement(String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, workbookId));
            if (remainingRefs == null || remainingRefs <= 0) {
                deleteWorkbookCacheKeys(workbookId);
                redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, workbookId));
                log.info("🗑️ [Workbook Cache] Removed shared cache for workbook {}", workbookId);
            }
            deleteRoomStartProblemSnapshot(roomId, workbookId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("⚠️ [Workbook Cache] Release interrupted for workbook {} via room {}. Skipping cache release.",
                    workbookId, roomId, e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    public String resolveWorkbookTitle(Map<Object, Object> roomInfo) {
        Object cachedTitle = roomInfo.get("workbookTitle");
        if (cachedTitle != null && !String.valueOf(cachedTitle).isBlank()) {
            return String.valueOf(cachedTitle);
        }

        Long workbookId = parseWorkbookId(roomInfo.get("selectedWorkbookId"));
        WorkbookCacheSnapshot snapshot = loadWorkbookCacheSnapshot(workbookId);
        if (snapshot != null && snapshot.workbookTitle() != null && !snapshot.workbookTitle().isBlank()) {
            return snapshot.workbookTitle();
        }

        return workbookRepository.findById(workbookId)
                .map(Workbook::getTitle)
                .orElse(null);
    }

    private Map<Object, Object> loadRoomInfo(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);
        if (roomInfo.isEmpty()) {
            throw new BusinessException(ErrorCode.GAME_ROOM_NOT_FOUND);
        }
        return new HashMap<>(roomInfo);
    }

    private WorkbookCacheSnapshot ensureWorkbookCache(Long workbookId, int requestedProblemCount, boolean forceRebuild) {
        WorkbookCacheSnapshot cachedSnapshot = forceRebuild ? null : loadWorkbookCacheSnapshot(workbookId);
        if (cachedSnapshot != null) {
            validateRequestedWorkbookProblemCount(requestedProblemCount, cachedSnapshot.problemCount());
            return cachedSnapshot;
        }

        RLock lock = getWorkbookCacheLock(workbookId);
        try {
            if (!lock.tryLock(2, 10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("문제집 캐시를 준비하는 중입니다. 잠시 후 다시 시도해주세요.");
            }

            if (!forceRebuild) {
                WorkbookCacheSnapshot snapshot = loadWorkbookCacheSnapshot(workbookId);
                if (snapshot != null) {
                    validateRequestedWorkbookProblemCount(requestedProblemCount, snapshot.problemCount());
                    return snapshot;
                }
            }

            Workbook workbook = workbookRepository.findById(workbookId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));
            List<Problem> problems = workbookProblemRepository.findByWorkbookWithProblem(workbook).stream()
                    .map(WorkbookProblem::getProblem)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            validateRequestedWorkbookProblemCount(requestedProblemCount, problems.size());
            long cachedAt = System.currentTimeMillis();
            String workbookUpdatedAt = formatWorkbookUpdatedAt(workbook);
            cacheWorkbookData(workbookId, workbook.getTitle(), problems, cachedAt, workbookUpdatedAt);

            return new WorkbookCacheSnapshot(
                    workbookId,
                    workbook.getTitle(),
                    problems.size(),
                    cachedAt,
                    estimatePreviewPayloadBytes(limitPreviewProblems(problems)),
                    workbookUpdatedAt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Workbook cache preparation interrupted", e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private void registerRoomCacheUsage(Long roomId, Map<Object, Object> roomInfo, WorkbookCacheSnapshot snapshot) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<String, String> updates = new HashMap<>();
        updates.put(PREVIEW_READY_FIELD, "true");
        updates.put(PREVIEW_COUNT_FIELD, String.valueOf(snapshot.problemCount()));
        updates.put(PREVIEW_CACHED_AT_FIELD, String.valueOf(snapshot.cachedAt()));
        updates.put("workbookTitle", snapshot.workbookTitle());
        updates.put(START_SNAPSHOT_WORKBOOK_UPDATED_AT_FIELD, snapshot.workbookUpdatedAt());

        if (!"true".equals(String.valueOf(roomInfo.getOrDefault(WORKBOOK_CACHE_REGISTERED_FIELD, "false")))) {
            redisTemplate.opsForValue().increment(String.format(RedisKeyConst.WORKBOOK_CACHE_REF_COUNT, snapshot.workbookId()));
            updates.put(WORKBOOK_CACHE_REGISTERED_FIELD, "true");
        }

        redisTemplate.opsForHash().putAll(infoKey, updates);
        roomInfo.putAll(updates);
        meterRegistry.summary(METRIC_REDIS_PREVIEW_BYTES, "problem_source", "WORKBOOK")
                .record(snapshot.previewBytes());
    }

    private List<Problem> prepareRoomStartProblemSnapshot(
            Long roomId,
            Map<Object, Object> roomInfo,
            WorkbookCacheSnapshot workbookSnapshot,
            int requestedProblemCount) {
        List<Problem> sampledProblems = loadSampledProblemsFromCache(workbookSnapshot.workbookId(), requestedProblemCount);
        if (sampledProblems.isEmpty()) {
            return Collections.emptyList();
        }

        String snapshotKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId);
        String metadataKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        List<Map<String, String>> snapshotPayloads = sampledProblems.stream()
                .map(this::toProblemMetadata)
                .toList();
        Map<String, String> snapshotMetadata = buildSnapshotMetadata(roomId, roomInfo, workbookSnapshot, requestedProblemCount);
        redisTemplate.delete(snapshotKey);
        if (!snapshotPayloads.isEmpty()) {
            redisTemplate.opsForList().rightPushAll(snapshotKey, snapshotPayloads.toArray());
        }
        redisTemplate.expire(snapshotKey, SNAPSHOT_TTL_HOURS, TimeUnit.HOURS);
        redisTemplate.opsForHash().putAll(metadataKey, snapshotMetadata);
        redisTemplate.expire(metadataKey, SNAPSHOT_TTL_HOURS, TimeUnit.HOURS);
        String roomIndexKey = String.format(RedisKeyConst.WORKBOOK_START_SNAPSHOT_ROOM_IDS, workbookSnapshot.workbookId());
        redisTemplate.opsForSet().add(roomIndexKey, String.valueOf(roomId));
        redisTemplate.expire(roomIndexKey, SNAPSHOT_TTL_HOURS, TimeUnit.HOURS);
        return sampledProblems;
    }

    private SnapshotLoadResult loadRoomStartProblemSnapshot(
            Long roomId,
            Map<Object, Object> roomInfo,
            Long workbookId,
            int problemCount) {
        String metadataKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId);
        Map<Object, Object> metadataMap = redisTemplate.opsForHash().entries(metadataKey);
        if (metadataMap.isEmpty()) {
            return SnapshotLoadResult.miss();
        }

        String staleReason = validateSnapshotMetadata(roomId, roomInfo, workbookId, problemCount, metadataMap);
        if (staleReason != null) {
            log.info("📋 [Game Start] Start snapshot stale for room {}: {}", roomId, staleReason);
            return SnapshotLoadResult.stale();
        }

        String snapshotKey = String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId);
        List<Object> metadata = redisTemplate.opsForList().range(snapshotKey, 0, problemCount - 1L);
        if (metadata == null || metadata.size() != problemCount || metadata.stream().anyMatch(Objects::isNull)) {
            return SnapshotLoadResult.stale();
        }

        List<Problem> problems = metadata.stream()
                .map(this::mapMetadataToProblem)
                .collect(Collectors.toList());
        long distinctProblemCount = problems.stream()
                .map(Problem::getId)
                .distinct()
                .count();
        if (distinctProblemCount != problemCount) {
            return SnapshotLoadResult.stale();
        }

        return SnapshotLoadResult.hit(problems);
    }

    private Map<String, String> buildSnapshotMetadata(
            Long roomId,
            Map<Object, Object> roomInfo,
            WorkbookCacheSnapshot workbookSnapshot,
            int requestedProblemCount) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("roomId", String.valueOf(roomId));
        metadata.put("workbookId", String.valueOf(workbookSnapshot.workbookId()));
        metadata.put("problemCount", String.valueOf(requestedProblemCount));
        metadata.put("selectionFilterHash", selectionFilterHash(roomInfo, workbookSnapshot.workbookId(), requestedProblemCount));
        metadata.put("roomSettingVersion", roomSettingVersion(roomInfo));
        metadata.put("workbookUpdatedAt", workbookSnapshot.workbookUpdatedAt());
        metadata.put("generatedAt", String.valueOf(System.currentTimeMillis()));
        metadata.put("snapshotId", UUID.randomUUID().toString());
        return metadata;
    }

    private String validateSnapshotMetadata(
            Long roomId,
            Map<Object, Object> roomInfo,
            Long workbookId,
            int problemCount,
            Map<Object, Object> metadataMap) {
        if (!Objects.equals(String.valueOf(roomId), stringValue(metadataMap.get("roomId")))) {
            return "room_id_mismatch";
        }
        if (!Objects.equals(String.valueOf(workbookId), stringValue(metadataMap.get("workbookId")))) {
            return "workbook_id_mismatch";
        }
        if (!Objects.equals(String.valueOf(problemCount), stringValue(metadataMap.get("problemCount")))) {
            return "problem_count_mismatch";
        }
        if (!Objects.equals(selectionFilterHash(roomInfo, workbookId, problemCount),
                stringValue(metadataMap.get("selectionFilterHash")))) {
            return "selection_filter_mismatch";
        }
        if (!Objects.equals(roomSettingVersion(roomInfo), stringValue(metadataMap.get("roomSettingVersion")))) {
            return "room_setting_mismatch";
        }

        String expectedWorkbookUpdatedAt = stringValue(roomInfo.get(START_SNAPSHOT_WORKBOOK_UPDATED_AT_FIELD));
        if (expectedWorkbookUpdatedAt == null || expectedWorkbookUpdatedAt.isBlank()) {
            return "workbook_updated_at_missing";
        }
        if (!Objects.equals(expectedWorkbookUpdatedAt, stringValue(metadataMap.get("workbookUpdatedAt")))) {
            return "workbook_updated_at_mismatch";
        }

        return null;
    }

    private void recordSnapshotFetch(String result, long startedAtNanos) {
        long durationNanos = Math.max(System.nanoTime() - startedAtNanos, 0L);
        Timer.builder(METRIC_GAME_START_SNAPSHOT_FETCH)
                .tag("problem_source", "WORKBOOK")
                .tag("result", result)
                .publishPercentiles(0.5, 0.95, 0.99)
                .publishPercentileHistogram()
                .register(meterRegistry)
                .record(durationNanos, TimeUnit.NANOSECONDS);
    }

    private void recordSnapshotResult(String result) {
        meterRegistry.counter(METRIC_GAME_START_SNAPSHOT_RESULT,
                "problem_source", "WORKBOOK",
                "result", result).increment();
    }

    private void deleteRoomStartProblemSnapshot(Long roomId, Long workbookId) {
        redisTemplate.delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.ROOM_START_PROBLEM_SNAPSHOT_META, roomId));
        if (workbookId != null) {
            redisTemplate.opsForSet()
                    .remove(String.format(RedisKeyConst.WORKBOOK_START_SNAPSHOT_ROOM_IDS, workbookId), String.valueOf(roomId));
        }
    }

    private List<Problem> loadPreviewProblemsFromCache(Long workbookId) {
        String previewIdsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId);
        List<Object> previewIds = redisTemplate.opsForList().range(previewIdsKey, 0, -1);
        if (previewIds == null || previewIds.isEmpty()) {
            return Collections.emptyList();
        }
        return loadProblemsFromMetadata(workbookId, previewIds);
    }

    private List<Problem> loadSampledProblemsFromCache(Long workbookId, int problemCount) {
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        Set<Object> sampledIds = redisTemplate.opsForSet().distinctRandomMembers(idsKey, problemCount);
        if (sampledIds == null || sampledIds.isEmpty()) {
            return Collections.emptyList();
        }
        return loadProblemsFromMetadata(workbookId, new ArrayList<>(sampledIds));
    }

    private List<Problem> loadProblemsFromMetadata(Long workbookId, List<Object> problemIds) {
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();
        List<Object> metadata = hashOperations.multiGet(metaKey, problemIds);
        if (metadata == null || metadata.size() != problemIds.size() || metadata.stream().anyMatch(Objects::isNull)) {
            return Collections.emptyList();
        }

        return metadata.stream()
                .map(this::mapMetadataToProblem)
                .collect(Collectors.toList());
    }

    private void cacheWorkbookData(
            Long workbookId,
            String workbookTitle,
            List<Problem> problems,
            long cachedAt,
            String workbookUpdatedAt) {
        String idsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId);
        String metaKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId);
        String previewIdsKey = String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId);
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);

        deleteWorkbookCacheKeys(workbookId);

        if (!problems.isEmpty()) {
            List<String> problemIds = problems.stream()
                    .map(problem -> String.valueOf(problem.getId()))
                    .toList();
            redisTemplate.opsForSet().add(idsKey, problemIds.toArray());

            Map<Object, Object> problemMetadata = new HashMap<>(problems.size());
            for (Problem problem : problems) {
                problemMetadata.put(String.valueOf(problem.getId()), toProblemMetadata(problem));
            }
            redisTemplate.opsForHash().putAll(metaKey, problemMetadata);

            List<String> previewIds = problems.stream()
                    .limit(WAITING_ROOM_PREVIEW_LIMIT)
                    .map(problem -> String.valueOf(problem.getId()))
                    .toList();
            if (!previewIds.isEmpty()) {
                redisTemplate.opsForList().rightPushAll(previewIdsKey, previewIds.toArray());
            }
        }

        List<Problem> previewProblems = limitPreviewProblems(problems);
        Map<String, String> cacheInfo = new HashMap<>();
        cacheInfo.put(WORKBOOK_CACHE_READY_FIELD, "true");
        cacheInfo.put(WORKBOOK_CACHE_COUNT_FIELD, String.valueOf(problems.size()));
        cacheInfo.put(WORKBOOK_CACHE_TITLE_FIELD, workbookTitle);
        cacheInfo.put(WORKBOOK_CACHE_PREVIEW_BYTES_FIELD, String.valueOf(estimatePreviewPayloadBytes(previewProblems)));
        cacheInfo.put(WORKBOOK_CACHE_CACHED_AT_FIELD, String.valueOf(cachedAt));
        cacheInfo.put(WORKBOOK_CACHE_UPDATED_AT_FIELD, workbookUpdatedAt);
        redisTemplate.opsForHash().putAll(cacheInfoKey, cacheInfo);

        meterRegistry.summary(METRIC_REDIS_WORKBOOK_CACHE_BYTES, "problem_source", "WORKBOOK")
                .record(estimateWorkbookCacheBytes(problems));
        log.info("📚 [Workbook Cache] Cached workbook {} with {} problems", workbookId, problems.size());
    }

    private void deleteWorkbookCacheKeys(Long workbookId) {
        redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId));
        redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId));
        redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId));
        redisTemplate.delete(String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId));
    }

    private WorkbookCacheSnapshot loadWorkbookCacheSnapshot(Long workbookId) {
        String cacheInfoKey = String.format(RedisKeyConst.WORKBOOK_CACHE_INFO, workbookId);
        Map<Object, Object> cacheInfo = redisTemplate.opsForHash().entries(cacheInfoKey);
        if (cacheInfo.isEmpty()) {
            return null;
        }

        String ready = String.valueOf(cacheInfo.getOrDefault(WORKBOOK_CACHE_READY_FIELD, "false"));
        int count = parseInt(cacheInfo.getOrDefault(WORKBOOK_CACHE_COUNT_FIELD, "0"));
        long cachedAt = parseLong(cacheInfo.getOrDefault(WORKBOOK_CACHE_CACHED_AT_FIELD, "0"));
        long previewBytes = parseLong(cacheInfo.getOrDefault(WORKBOOK_CACHE_PREVIEW_BYTES_FIELD, "0"));
        String workbookTitle = String.valueOf(cacheInfo.getOrDefault(WORKBOOK_CACHE_TITLE_FIELD, ""));
        String workbookUpdatedAt = stringValue(cacheInfo.get(WORKBOOK_CACHE_UPDATED_AT_FIELD));

        boolean cacheReady = "true".equals(ready)
                && count > 0
                && workbookUpdatedAt != null
                && !workbookUpdatedAt.isBlank()
                && Boolean.TRUE.equals(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_IDS, workbookId)))
                && Boolean.TRUE.equals(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PROBLEM_META, workbookId)))
                && Boolean.TRUE.equals(redisTemplate.hasKey(String.format(RedisKeyConst.WORKBOOK_CACHE_PREVIEW_IDS, workbookId)));
        if (!cacheReady) {
            return null;
        }

        return new WorkbookCacheSnapshot(workbookId, workbookTitle, count, cachedAt, previewBytes, workbookUpdatedAt);
    }

    private void markRoomPreviewUnavailable(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        redisTemplate.opsForHash().put(infoKey, PREVIEW_READY_FIELD, "false");
        redisTemplate.opsForHash().put(infoKey, PREVIEW_COUNT_FIELD, "0");
        redisTemplate.opsForHash().delete(infoKey, PREVIEW_CACHED_AT_FIELD);
    }

    private Map<String, String> toProblemMetadata(Problem problem) {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("id", String.valueOf(problem.getId()));
        metadata.put("externalId", problem.getExternalId());
        metadata.put("title", problem.getTitle());
        metadata.put("tier", problem.getTier());
        metadata.put("url", problem.getUrl());
        return metadata;
    }

    private Problem mapMetadataToProblem(Object metadata) {
        if (!(metadata instanceof Map<?, ?> metadataMap)) {
            throw new BusinessException(ErrorCode.GAME_INVALID_ROOM_DATA, "문제집 캐시 데이터가 손상되었습니다.");
        }

        return Problem.builder()
                .id(Long.parseLong(String.valueOf(metadataMap.get("id"))))
                .externalId(String.valueOf(metadataMap.get("externalId")))
                .title(String.valueOf(metadataMap.get("title")))
                .tier(String.valueOf(metadataMap.get("tier")))
                .url(String.valueOf(metadataMap.get("url")))
                .build();
    }

    private List<Problem> limitPreviewProblems(List<Problem> problems) {
        if (problems.isEmpty()) {
            return Collections.emptyList();
        }
        return problems.stream()
                .limit(WAITING_ROOM_PREVIEW_LIMIT)
                .collect(Collectors.toList());
    }

    private void validateRequestedWorkbookProblemCount(int requestedProblemCount, int availableProblemCount) {
        validateRequestedWorkbookProblemCount(requestedProblemCount, (long) availableProblemCount);
    }

    private void validateRequestedWorkbookProblemCount(int requestedProblemCount, long availableProblemCount) {
        if (requestedProblemCount > availableProblemCount) {
            throw new BusinessException(
                    ErrorCode.GAME_PROBLEM_COUNT_EXCEEDED,
                    String.format("문제집에 있는 문제(%d개)보다 더 많은 문제(%d개)를 요청할 수 없습니다.",
                            availableProblemCount, requestedProblemCount));
        }
        if (availableProblemCount == 0) {
            throw new IllegalStateException("문제집에 등록된 문제가 없습니다.");
        }
    }

    private RLock getWorkbookCacheLock(Long workbookId) {
        return redissonClient.getLock(String.format(RedisKeyConst.LOCK_WORKBOOK_CACHE, workbookId));
    }

    public Long parseWorkbookId(Object workbookIdValue) {
        if (workbookIdValue == null) {
            throw new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND);
        }

        String workbookIdStr = String.valueOf(workbookIdValue);
        try {
            if (workbookIdStr.startsWith("wb")) {
                return Long.parseLong(workbookIdStr.replace("wb", ""));
            }
            return Long.parseLong(workbookIdStr);
        } catch (NumberFormatException exception) {
            throw new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND, "유효하지 않은 문제집 ID입니다.");
        }
    }

    static long estimatePreviewPayloadBytes(List<Problem> problems) {
        long totalBytes = 0L;
        for (Problem problem : problems) {
            totalBytes += utf8Length(String.valueOf(problem.getId()));
            totalBytes += utf8Length(problem.getExternalId());
            totalBytes += utf8Length(problem.getTitle());
            totalBytes += utf8Length(problem.getTier());
            totalBytes += utf8Length(problem.getUrl());
        }
        return totalBytes;
    }

    static long estimateWorkbookCacheBytes(List<Problem> problems) {
        long totalBytes = 0L;
        for (Problem problem : problems) {
            totalBytes += utf8Length(String.valueOf(problem.getId()));
            totalBytes += utf8Length(problem.getExternalId());
            totalBytes += utf8Length(problem.getTitle());
            totalBytes += utf8Length(problem.getTier());
            totalBytes += utf8Length(problem.getUrl());
        }
        return totalBytes;
    }

    private static int utf8Length(String value) {
        return value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;
    }

    private String selectionFilterHash(Map<Object, Object> roomInfo, Long workbookId, int problemCount) {
        return sha256(String.join("|",
                "problemSource=" + stringValue(roomInfo.getOrDefault("problemSource", "WORKBOOK")),
                "workbookId=" + workbookId,
                "problemCount=" + problemCount,
                "tierMin=" + stringValue(roomInfo.getOrDefault("tierMin", "")),
                "tierMax=" + stringValue(roomInfo.getOrDefault("tierMax", "")),
                "tags=" + normalizeTags(stringValue(roomInfo.get("tags")))));
    }

    private String roomSettingVersion(Map<Object, Object> roomInfo) {
        return sha256(String.join("|",
                "teamType=" + stringValue(roomInfo.getOrDefault("teamType", "")),
                "mode=" + stringValue(roomInfo.getOrDefault("mode", "")),
                "timeLimit=" + stringValue(roomInfo.getOrDefault("timeLimit", ""))));
    }

    private String normalizeTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return "";
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .sorted()
                .collect(Collectors.joining(","));
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashed.length * 2);
            for (byte b : hashed) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest is not available", e);
        }
    }

    private String formatWorkbookUpdatedAt(Workbook workbook) {
        LocalDateTime updatedAt = workbook.getUpdatedAt() != null ? workbook.getUpdatedAt() : workbook.getCreatedAt();
        return updatedAt == null ? "0" : updatedAt.toString();
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Long parseLongOrNull(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private int parseInt(Object value) {
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return 0;
        }
    }

    private long parseLong(Object value) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    record WorkbookCacheSnapshot(
            Long workbookId,
            String workbookTitle,
            int problemCount,
            long cachedAt,
            long previewBytes,
            String workbookUpdatedAt) {
    }

    public record WorkbookProblemSelection(List<Problem> problems, String cacheStatus) {
    }

    private record SnapshotLoadResult(String result, List<Problem> problems) {
        static SnapshotLoadResult hit(List<Problem> problems) {
            return new SnapshotLoadResult(SNAPSHOT_RESULT_HIT, problems);
        }

        static SnapshotLoadResult miss() {
            return new SnapshotLoadResult(SNAPSHOT_RESULT_MISS, Collections.emptyList());
        }

        static SnapshotLoadResult stale() {
            return new SnapshotLoadResult(SNAPSHOT_RESULT_STALE, Collections.emptyList());
        }
    }
}
