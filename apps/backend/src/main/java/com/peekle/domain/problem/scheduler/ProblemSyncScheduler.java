package com.peekle.domain.problem.scheduler;

import com.peekle.domain.problem.service.ProblemSyncJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProblemSyncScheduler {

    private final ProblemSyncJobService problemSyncJobService;

    @Value("${problem.sync.monthly.enabled:true}")
    private boolean enabled;

    @Value("${problem.sync.monthly.first-week-only:true}")
    private boolean firstWeekOnly;

    @Value("${problem.sync.monthly.zone:Asia/Seoul}")
    private String zoneId;

    @Scheduled(cron = "${problem.sync.monthly.cron:0 0 4 * * SUN}", zone = "${problem.sync.monthly.zone:Asia/Seoul}")
    public void runMonthlyBojSync() {
        if (!enabled) {
            return;
        }

        LocalDate today = LocalDate.now(ZoneId.of(zoneId));
        if (firstWeekOnly && today.getDayOfMonth() > 7) {
            log.debug("BOJ 월간 동기화 스킵: 첫째 주가 아닙니다. date={}", today);
            return;
        }

        log.info("=== BOJ 월간 재동기화 스케줄러 실행 date={} ===", today);
        problemSyncJobService.runScheduledMonthlySync();
    }
}
