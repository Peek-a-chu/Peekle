package com.peekle.domain.cs.dto.response;

public record CsAdminQuestionShortAnswerResponse(
        Long shortAnswerId,
        String answerText,
        String normalizedAnswer,
        Integer blankIndex,
        Boolean isPrimary) {
}
