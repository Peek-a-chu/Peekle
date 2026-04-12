package com.peekle.domain.ai.dto.response;

import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.ai.enums.RecommendationRefreshType;

import java.util.List;

public record DailyRecommendationResponse(
        List<RecommendedProblem> recommendations,
        RecommendationRefreshType refreshType,
        String notice,
        Integer manualRefreshRemaining
) {
}
