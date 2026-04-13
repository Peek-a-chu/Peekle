package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionType;

import java.util.List;

public record CsAdminQuestionResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        String explanation,
        Boolean isActive,
        List<CsAdminQuestionChoiceResponse> choices,
        List<CsAdminQuestionShortAnswerResponse> shortAnswers) {
}
