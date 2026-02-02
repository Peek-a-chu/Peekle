package com.peekle.domain.ai.dto.response;

import java.util.List;

public record RecommendationResponse(
    List<RecommendedProblem> recommendations
) {
    public record RecommendedProblem(
        String problem, 
        String reason   
    ) {}
}