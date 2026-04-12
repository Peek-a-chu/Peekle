package com.peekle.domain.cs.dto.response;

public record CsWrongReviewCompleteResponse(
        String reviewId,
        Integer totalQuestionCount,
        Integer correctRate,
        Integer correctCount,
        Integer wrongCount,
        String messageCode,
        Integer clearedCount,
        Integer remainedActiveCount) {
}
