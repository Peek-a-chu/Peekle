package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionContentMode;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;

import java.util.List;

public record CsAdminQuestionResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        String explanation,
        CsQuestionContentMode contentMode,
        String contentBlocks,
        CsQuestionGradingMode gradingMode,
        String metadata,
        Boolean isActive,
        List<CsAdminQuestionChoiceResponse> choices,
        List<CsAdminQuestionShortAnswerResponse> shortAnswers) {
}
