package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CsAdminQuestionShortAnswerDraft(
        @NotBlank(message = "answerText는 필수입니다.")
        String answerText,
        Integer blankIndex,
        Boolean isPrimary) {
}
