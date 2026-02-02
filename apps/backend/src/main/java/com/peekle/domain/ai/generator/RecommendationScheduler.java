package com.peekle.domain.ai.generator;

import com.peekle.domain.ai.service.RecommendationService;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationScheduler {
    private final RecommendationService recommendationService;
    private final UserRepository userRepository;

    // 매일 새벽 3시에 실행 (0초 0분 3시 매일 매월 매요일)
    @Scheduled(cron = "0 0 3 * * *")
    public void runDailyRecommendation() {
        log.info("오늘의 AI 추천 문제 생성 배치를 시작합니다.");
        
        // 활성 유저 리스트를 돌며 Redis에 추천 결과 생성
        userRepository.findAllActiveUsers().forEach(user -> {
            try {
                recommendationService.getOrGenerateRecommendations(user.getId());
                log.info("유저 {}님 추천 생성 완료", user.getId());
            } catch (Exception e) {
                log.error("유저 {}님 추천 생성 중 오류 발생", user.getId(), e);
            }
        });
    }
}