package com.peekle.domain.ai.dto.response;

import java.util.List;

public record RecommendationResponse(
    List<RecommendedProblem> recommendations
) {
    public record RecommendedProblem(
        String id,
        String title,
        String tierType,  
        Integer tierLevel, 
        List<String> tags,
        String reason
    ) {}
}