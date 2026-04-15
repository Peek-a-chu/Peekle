package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionContentMode;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;

import java.util.List;

public record CsQuestionPayloadResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        CsQuestionContentMode contentMode,
        String contentBlocks,
        CsQuestionGradingMode gradingMode,
        String metadata,
        List<CsQuestionChoiceResponse> choices) {
}
