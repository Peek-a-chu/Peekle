package com.peekle.domain.user.scheduler;

import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserScheduler {

    private final UserRepository userRepository;

    /**
     * 매일 오전 6시에 스트릭 초기화
     * - 어제(05:59 기준 lastSolvedDate) 문제를 풀지 않은 유저의 스트릭을 0으로 리셋
     * - 즉, lastSolvedDate < yesterday 인 유저 대상
     */
    @Scheduled(cron = "0 0 6 * * *", zone = "Asia/Seoul")
    @Transactional
    public void resetStreaks() {
        log.info("=== 스트릭 초기화 스케줄러 실행 ===");

        // 오늘(실행 시점) 날짜 (예: 2/3 06:00)
        // yesterday (예: 2/2)
        // lastSolvedDate가 2/2보다 전(예: 2/1)이라면 -> 2/2에 문제를 풀지 않음 -> 스트릭 깨짐
        // lastSolvedDate가 2/2라면 -> 2/2(2/2 06:00 ~ 2/3 06:00)에 문제를 풂 -> 스트릭 유지

        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        LocalDate yesterday = now.toLocalDate().minusDays(1);

        try {
            userRepository.resetBrokenStreaks(yesterday);
            log.info("✅ 스트릭 초기화 완료 (기준 날짜: {} 미만, 즉 {}포함 이전 날짜를 가진 유저 초기화)", yesterday, yesterday.minusDays(1));
        } catch (Exception e) {
            log.error("❌ 스트릭 초기화 중 오류 발생", e);
        }
    }
}
