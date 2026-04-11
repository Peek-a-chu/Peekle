package com.peekle.domain.cs.dto.response;

public record CsAttemptProgressResponse(
        Integer currentQuestionNo,
        Integer totalQuestionCount) {
}
