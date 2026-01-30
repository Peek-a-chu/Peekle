package com.peekle.domain.league.scheduler;

import com.peekle.domain.league.service.LeagueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 리그 시즌 관리 스케줄러
 * 매주 수요일 오전 6시에 실행되어 시즌을 종료하고 새로운 시즌을 시작합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeagueScheduler {

    private final LeagueService leagueService;

    /**
     * 매주 수요일 오전 6시에 실행
     * cron: 초 분 시 일 월 요일
     * 0 0 6 * * 3 = 매주 수요일(3) 오전 6시 0분 0초
     */
    @Scheduled(cron = "0 0 6 * * WED", zone = "Asia/Seoul")
    public void closeSeasonAndStartNew() {
        log.info("=== 리그 시즌 종료 및 신규 시즌 시작 스케줄러 실행 ===");

        try {
            // 1. 현재 시즌 종료 처리
            leagueService.closeSeason();
            log.info("✅ 리그 시즌 종료 완료");

            // 2. 신규 시즌 시작 (새로운 그룹 생성 및 재배정)
            leagueService.startNewSeason();
            log.info("✅ 신규 리그 시즌 시작 완료");

        } catch (Exception e) {
            log.error("❌ 리그 시즌 처리 중 오류 발생", e);
            // TODO: 슬랙/디스코드 알림 등 추가 가능
        }
    }

    /**
     * 테스트용: 매일 자정에 실행 (개발 중 확인용)
     * 배포 시 주석 처리 또는 제거 필요
     */
    // @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    // public void testDailySeasonCheck() {
    // log.info("=== [TEST] 일일 시즌 체크 ===");
    // // 테스트 로직
    // }
}
