package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.Positive;

public record CsWrongReviewStartRequest(
        Integer domainId,
        @Positive(message = "stageId는 1 이상의 값이어야 합니다.")
        Long stageId,
        @Positive(message = "questionCount는 1 이상의 값이어야 합니다.")
        Integer questionCount) {
}
