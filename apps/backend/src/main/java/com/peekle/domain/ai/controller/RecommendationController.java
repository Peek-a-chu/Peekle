package com.peekle.domain.ai.controller;

import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.ai.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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
     * GET /api/recommendations/{userId}/daily
     * * 1. Redis에 있으면 그거 리턴
     * 2. 없으면 AI 서버에 요청해서 생성 후 리턴
     */
    @GetMapping("/{userId}/daily")
    public ResponseEntity<List<RecommendedProblem>> getDailyRecommendations(@PathVariable Long userId) {
        log.info("추천 문제 요청 - userId: {}", userId);
        
        List<RecommendedProblem> recommendations = recommendationService.getOrGenerateRecommendations(userId);
        
        return ResponseEntity.ok(recommendations);
    }
}