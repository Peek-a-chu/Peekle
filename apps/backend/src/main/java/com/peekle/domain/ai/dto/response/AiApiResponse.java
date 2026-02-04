package com.peekle.domain.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * AI 서버의 원본 응답을 그대로 받기 위한 DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiApiResponse(
    List<AiRecommendedProblem> recommendations
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiRecommendedProblem(
        String problemId,
        String title,
        String tier,    // "Gold 4" 또는 "Gold IV" 등
        String tags,    // "구현, 그리디"
        String reason,
        String keyword
    ) {}
}
