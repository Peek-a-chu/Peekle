package com.peekle.domain.ai.service;

import com.peekle.domain.ai.dto.request.TagStatDto;
import com.peekle.domain.ai.dto.request.UserActivityRequest;
import com.peekle.domain.ai.dto.response.AiApiResponse;
import com.peekle.domain.ai.dto.response.DailyRecommendation;
import com.peekle.domain.ai.dto.response.RecommendationResponse;
import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;

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
    private final ObjectMapper objectMapper;

    private static final String REDIS_KEY_PREFIX = "user:recommend:";
    private static final long CACHE_TTL_HOURS = 24;

    public List<RecommendedProblem> getOrGenerateRecommendations(Long userId) {
        log.info("추천 로직 시작 - userId: {}", userId);
        String key = REDIS_KEY_PREFIX + userId;

        try {
            // 1. Redis 캐시 확인
            Object cachedObject = redisTemplate.opsForValue().get(key);
            if (cachedObject != null) {
                DailyRecommendation cached;
                if (cachedObject instanceof DailyRecommendation) {
                    cached = (DailyRecommendation) cachedObject;
                } else {
                    // LinkedHashMap 등으로 반환된 경우 변환
                    cached = objectMapper.convertValue(cachedObject, DailyRecommendation.class);
                }
                return cached.problems();
            }

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

        try {
            String jsonBody = objectMapper.writeValueAsString(request);
            log.info("AI 서버로 보낼 JSON 데이터: {}", jsonBody);
        } catch (Exception e) {
            log.warn("요청 JSON 변환 중 오류 발생: {}", e.getMessage());
        }

        AiApiResponse aiResponse = aiRestClient.post()
                .uri("/recommend/intelligent")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request) // RestClient가 객체를 JSON으로 자동 변환
                .retrieve()
                .body(AiApiResponse.class);

        if (aiResponse == null || aiResponse.recommendations() == null) {
            return new RecommendationResponse(List.of());
        }

        List<RecommendedProblem> mapped = aiResponse.recommendations().stream()
                .map(this::mapToRecommendedProblem)
                .toList();

        return new RecommendationResponse(mapped);
    }

    private RecommendedProblem mapToRecommendedProblem(AiApiResponse.AiRecommendedProblem aiProblem) {
        // 티어 파싱: "Gold 4" -> type="gold", level=4
        String fullTier = aiProblem.tier() != null ? aiProblem.tier() : "Bronze 5";
        String[] parts = fullTier.split(" ");
        
        String tierType = "bronze";
        Integer tierLevel = 5;

        if (parts.length >= 1) {
            tierType = parts[0].toLowerCase();
        }
        if (parts.length >= 2) {
            try {
                // 숫자인 경우 (4) 처리
                tierLevel = Integer.parseInt(parts[1]);
            } catch (NumberFormatException e) {
                // 로마자인 경우 (IV) 처리 로직 (필요시 추가)
                tierLevel = parseRoman(parts[1]);
            }
        }

        // 태그 파싱: "구현, 그리디" -> ["구현", "그리디"]
        List<String> tags = List.of();
        if (aiProblem.tags() != null && !aiProblem.tags().isEmpty()) {
            tags = java.util.Arrays.stream(aiProblem.tags().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }

        return new RecommendedProblem(
                aiProblem.problemId(),
                aiProblem.title(),
                tierType,
                tierLevel,
                tags,
                aiProblem.reason()
        );
    }

    private Integer parseRoman(String roman) {
        return switch (roman.toUpperCase()) {
            case "I" -> 1;
            case "II" -> 2;
            case "III" -> 3;
            case "IV" -> 4;
            case "V" -> 5;
            default -> 5;
        };
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

        // 성공한 문제 제목 추출 (isSuccess 기반)
        List<String> solvedTitles = recentLogs.stream()
                .filter(log -> Boolean.TRUE.equals(log.getIsSuccess()))
                .map(SubmissionLog::getProblemTitle)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        // 실패한 문제 제목 추출 (isSuccess 기반)
        List<String> failedTitles = recentLogs.stream()
                .filter(log -> Boolean.FALSE.equals(log.getIsSuccess()))
                .map(SubmissionLog::getProblemTitle)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        // 태그별 통계 생성 (isSuccess 기반 정답률 계산)
        List<TagStatDto> tagStatDtos = recentLogs.stream()
                .filter(log -> log.getTag() != null)
                .collect(java.util.stream.Collectors.groupingBy(SubmissionLog::getTag))
                .entrySet().stream()
                .map(entry -> {
                    String tagName = entry.getKey();
                    List<SubmissionLog> tagLogs = entry.getValue();
                    long totalCount = tagLogs.size();
                    long successCount = tagLogs.stream()
                            .filter(log -> Boolean.TRUE.equals(log.getIsSuccess()))
                            .count();
                    double accuracyRate = totalCount > 0 ? (double) successCount / totalCount : 0.0;
                    return new TagStatDto(tagName, accuracyRate, (int) totalCount);
                })
                .toList();

        return new UserActivityRequest(
                solvedTitles,
                failedTitles,
                tagStatDtos,
                user.getLeague().name()
        );
    }

}