package com.peekle.domain.ai.service;

import com.peekle.domain.ai.dto.request.TagStatDto;
import com.peekle.domain.ai.dto.request.UserActivityRequest;
import com.peekle.domain.ai.dto.response.DailyRecommendation;
import com.peekle.domain.ai.dto.response.RecommendationResponse;
import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final SubmissionLogRepository logRepository;
    private final UserRepository userRepository;
    private final RestClient aiRestClient; // AiConfig에서 만든 Bean 주입

    private static final String REDIS_KEY_PREFIX = "user:recommend:";
    private static final long CACHE_TTL_HOURS = 24;

    public List<RecommendedProblem> getOrGenerateRecommendations(Long userId) {
        log.info("추천 로직 시작 - userId: {}", userId);
        String key = REDIS_KEY_PREFIX + userId;

        try {
            // 1. Redis 캐시 확인
            DailyRecommendation cached = (DailyRecommendation) redisTemplate.opsForValue().get(key);
            if (cached != null) return cached.problems();

            // 2. 캐시 없으면 AI 서버 호출
            RecommendationResponse response = callAiServer(userId);

            if (response == null || response.recommendations().isEmpty()) {
                log.warn("AI 서버에서 추천 결과를 받지 못했습니다. user: {}", userId);
                return List.of();
            }

            // 3. Redis 저장
            DailyRecommendation daily = new DailyRecommendation(userId, response.recommendations(), LocalDateTime.now());
            redisTemplate.opsForValue().set(key, daily, CACHE_TTL_HOURS, TimeUnit.HOURS);

            return response.recommendations();

        } catch (Exception e) {
            log.error("추천 로직 수행 중 오류 발생: {}", e.getMessage());
            return List.of();
        }
    }

    private RecommendationResponse callAiServer(Long userId) {
        UserActivityRequest request = fetchUserActivity(userId);

        return aiRestClient.post()
                .uri("/recommend/intelligent")
                .body(request)
                .retrieve()
                .body(RecommendationResponse.class);
    }

    private UserActivityRequest fetchUserActivity(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 최근 제출 기록 조회 (유저의 모든 제출, 최신순 정렬)
        List<SubmissionLog> logs = logRepository.findAllByUserIdOrderBySubmittedAtAsc(userId);
        
        // 최근 20개만 사용
        List<SubmissionLog> recentLogs = logs.stream()
                .sorted((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt()))
                .limit(20)
                .toList();

        // 현재 SubmissionLog에는 status 필드가 없음 - 모든 제출을 성공으로 간주
        List<String> solvedTitles = recentLogs.stream()
                .map(SubmissionLog::getProblemTitle)
                .filter(title -> title != null)
                .distinct()
                .toList();

        // 태그별 통계 생성 (간단히 태그 개수만 집계)
        List<TagStatDto> tagStatDtos = recentLogs.stream()
                .filter(log -> log.getTag() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        SubmissionLog::getTag,
                        java.util.stream.Collectors.counting()
                ))
                .entrySet().stream()
                .map(e -> new TagStatDto(e.getKey(), 1.0, e.getValue().intValue()))
                .toList();

        return new UserActivityRequest(
                solvedTitles,
                List.of(), // 실패 기록은 현재 구분 불가
                tagStatDtos,
                user.getLeague().name()
        );
    }
}