package com.peekle.domain.cs.dto.response;

public record CsWrongReviewStartResponse(
        String reviewId,
        Integer totalQuestionCount,
        CsQuestionPayloadResponse firstQuestion) {
}
