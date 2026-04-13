package com.peekle.domain.cs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CsAdminStageQuestionImportRequest(
        @NotBlank(message = "mode는 필수입니다.")
        String mode,

        @NotNull(message = "questions는 필수입니다.")
        List<@Valid CsAdminQuestionDraft> questions) {
}
