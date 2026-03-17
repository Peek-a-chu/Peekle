package com.peekle.domain.ai.dto.request;

import com.peekle.domain.ai.enums.RecommendationFeedbackType;
import jakarta.validation.constraints.NotNull;

public record FeedbackRequest(
        @NotNull(message = "피드백 타입은 필수입니다.")
        RecommendationFeedbackType feedback
) {
}
