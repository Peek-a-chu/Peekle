package com.peekle.domain.cs.dto.request;

import com.peekle.domain.cs.enums.CsQuestionClaimType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CsQuestionClaimCreateRequest(
        @NotNull @Positive Long questionId,
        @NotNull CsQuestionClaimType claimType,
        @NotBlank @Size(min = 5, max = 2000) String description,
        @NotNull Boolean isCorrect,
        @Positive Integer selectedChoiceNo,
        @Size(max = 2000) String submittedAnswer) {
}
