package com.peekle.domain.ai.controller;

import com.peekle.domain.ai.dto.request.FeedbackRequest;
import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.ai.enums.RecommendationFeedbackType;
import com.peekle.domain.ai.service.RecommendationService;
import com.peekle.global.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
     * 1. Redis에 있으면 그거 리턴
     * 2. 없으면 AI 서버에 요청해서 생성 후 리턴
     */
    @GetMapping("/daily")
    public ApiResponse<List<RecommendedProblem>> getDailyRecommendations(@AuthenticationPrincipal Long userId) {
        log.info("추천 문제 요청 - userId: {}", userId);
        
        List<RecommendedProblem> recommendations = recommendationService.getOrGenerateRecommendations(userId);
        
        return ApiResponse.success(recommendations);
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