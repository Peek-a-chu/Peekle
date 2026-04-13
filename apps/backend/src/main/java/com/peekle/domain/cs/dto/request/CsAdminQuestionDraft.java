package com.peekle.domain.cs.dto.request;

import com.peekle.domain.cs.enums.CsQuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CsAdminQuestionDraft(
        Long questionId,

        @NotNull(message = "questionType은 필수입니다.")
        CsQuestionType questionType,

        @NotBlank(message = "prompt는 필수입니다.")
        String prompt,

        @NotBlank(message = "explanation은 필수입니다.")
        String explanation,

        List<@Valid CsAdminQuestionChoiceDraft> choices,

        List<@Valid CsAdminQuestionShortAnswerDraft> shortAnswers) {
}
