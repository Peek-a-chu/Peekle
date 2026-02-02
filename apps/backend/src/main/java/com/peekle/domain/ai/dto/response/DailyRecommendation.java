package com.peekle.domain.ai.dto.response;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Redis 저장 및 프론트엔드 반환용 객체
 */
public record DailyRecommendation(
    Long userId,
    List<RecommendationResponse.RecommendedProblem> problems,
    LocalDateTime createdAt
) implements Serializable {
    private static final long serialVersionUID = 1L;
}