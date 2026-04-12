package com.peekle.domain.ai.controller;

import com.peekle.domain.ai.dto.request.FeedbackRequest;
import com.peekle.domain.ai.dto.response.DailyRecommendationResponse;
import com.peekle.domain.ai.enums.RecommendationFeedbackType;
import com.peekle.domain.ai.service.RecommendationService;
import com.peekle.global.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Slf4j
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * 오늘의 추천 문제 조회
     * GET /api/recommendations/daily
     *
     * 1. 기존 추천 3문제가 남아있고 미해결 상태면 재사용
     * 2. 3문제 모두 해결했거나 추천이 비어있으면 새 추천 생성 시도
     */
    @GetMapping("/daily")
    public ApiResponse<DailyRecommendationResponse> getDailyRecommendations(@AuthenticationPrincipal Long userId) {
        log.info("추천 문제 요청 - userId: {}", userId);

        DailyRecommendationResponse response = recommendationService.getDailyRecommendations(userId);
        return ApiResponse.success(response);
    }

    /**
     * 수동 새로고침
     * POST /api/recommendations/refresh
     */
    @PostMapping("/refresh")
    public ApiResponse<DailyRecommendationResponse> refreshRecommendations(@AuthenticationPrincipal Long userId) {
        log.info("추천 문제 수동 새로고침 요청 - userId: {}", userId);

        DailyRecommendationResponse response = recommendationService.refreshRecommendationsManually(userId);
        return ApiResponse.success(response);
    }

    /**
     * 현재 피드백 조회
     * GET /api/recommendations/feedback
     */
    @GetMapping("/feedback")
    public ApiResponse<String> getFeedback(@AuthenticationPrincipal Long userId) {
        RecommendationFeedbackType feedback = recommendationService.getFeedback(userId);
        return ApiResponse.success(feedback != null ? feedback.name() : null);
    }

    /**
     * 피드백 제출/업데이트 (upsert)
     * POST /api/recommendations/feedback
     */
    @PostMapping("/feedback")
    public ApiResponse<String> submitFeedback(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody FeedbackRequest request) {
        log.info("피드백 제출 - userId: {}, feedback: {}", userId, request.feedback());
        RecommendationFeedbackType result = recommendationService.upsertFeedback(userId, request.feedback());
        return ApiResponse.success(result.name());
    }
}
