package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CsWrongReviewAnswerRequest(
        @NotNull(message = "questionId는 필수입니다.")
        @Positive(message = "questionId는 1 이상의 값이어야 합니다.")
        Long questionId,
        @Positive(message = "selectedChoiceNo는 1 이상의 값이어야 합니다.")
        Integer selectedChoiceNo,
        String answerText) {
}
