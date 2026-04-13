package com.peekle.domain.cs.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CsAdminQuestionShortAnswersUpdateRequest(
        @NotNull(message = "shortAnswers는 필수입니다.")
        List<@Valid CsAdminQuestionShortAnswerDraft> shortAnswers) {
}
