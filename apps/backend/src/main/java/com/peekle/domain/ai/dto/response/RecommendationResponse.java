package com.peekle.domain.ai.dto.response;

import java.util.List;

public record RecommendationResponse(
    List<RecommendedProblem> recommendations
) {
    public record RecommendedProblem(
        String id,
        String title,
        String tierType,  // "bronze", "silver", "gold" 등
        Integer tierLevel, // 1~5
        List<String> tags,
        String reason
    ) {}
}