package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CsAdminQuestionChoiceDraft(
        @NotNull(message = "choiceNo는 필수입니다.")
        @Positive(message = "choiceNo는 1 이상의 값이어야 합니다.")
        Integer choiceNo,

        @NotBlank(message = "content는 필수입니다.")
        String content,

        @NotNull(message = "isAnswer는 필수입니다.")
        Boolean isAnswer) {
}
