package com.peekle.domain.problem.service;

import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProblemSyncJobService {

    private final ProblemService problemService;
    private final RedissonClient redissonClient;

    @Value("${problem.sync.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${problem.sync.retry.backoff-seconds:0,1800,7200}")
    private List<Long> retryBackoffSeconds;

    public void runScheduledMonthlySync() {
        runSyncWithRetry(1, "SCHEDULED_MONTHLY");
    }

    public boolean triggerManualSyncAsync(int startPage) {
        if (isSyncRunning()) {
            return false;
        }
        runManualSyncAsync(startPage);
        return true;
    }

    public boolean isSyncRunning() {
        return redissonClient.getLock(RedisKeyConst.LOCK_PROBLEM_SYNC_BOJ).isLocked();
    }

    @Async
    public void runManualSyncAsync(int startPage) {
        runSyncWithRetry(startPage, "MANUAL");
    }

    private void runSyncWithRetry(int startPage, String trigger) {
        RLock lock = redissonClient.getLock(RedisKeyConst.LOCK_PROBLEM_SYNC_BOJ);
        boolean acquired = false;

        try {
            acquired = lock.tryLock(0, TimeUnit.SECONDS);
            if (!acquired) {
                log.warn("BOJ 동기화 실행 스킵: 이미 동기화가 실행 중입니다. trigger={}", trigger);
                return;
            }

            int attempts = Math.max(1, maxAttempts);
            for (int attempt = 1; attempt <= attempts; attempt++) {
                long backoffSeconds = resolveBackoffSeconds(attempt);
                if (backoffSeconds > 0) {
                    sleepBackoff(backoffSeconds, trigger, attempt);
                }

                try {
                    ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(Math.max(startPage, 1));
                    log.info(
                            "BOJ 동기화 성공 trigger={} attempt={} fetched={} inserted={} updated={} unchanged={} failed={} startPage={} lastProcessedPage={}",
                            trigger,
                            attempt,
                            summary.fetched(),
                            summary.inserted(),
                            summary.updated(),
                            summary.unchanged(),
                            summary.failed(),
                            summary.startPage(),
                            summary.lastProcessedPage());
                    return;
                } catch (Exception e) {
                    log.error("BOJ 동기화 실패 trigger={} attempt={}/{}", trigger, attempt, attempts, e);
                }
            }

            log.error("BOJ 동기화 최종 실패 trigger={} attempts={}", trigger, attempts);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("BOJ 동기화 락 획득 대기 중 인터럽트 trigger={}", trigger, e);
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private long resolveBackoffSeconds(int attempt) {
        if (retryBackoffSeconds == null || retryBackoffSeconds.isEmpty()) {
            return 0L;
        }
        int index = Math.min(Math.max(attempt - 1, 0), retryBackoffSeconds.size() - 1);
        Long value = retryBackoffSeconds.get(index);
        return value == null ? 0L : Math.max(value, 0L);
    }

    private void sleepBackoff(long backoffSeconds, String trigger, int attempt) {
        try {
            log.warn("BOJ 동기화 재시도 대기 trigger={} attempt={} sleep={}s", trigger, attempt, backoffSeconds);
            Thread.sleep(backoffSeconds * 1000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("BOJ 동기화 재시도 대기 중 인터럽트", e);
        }
    }
}
