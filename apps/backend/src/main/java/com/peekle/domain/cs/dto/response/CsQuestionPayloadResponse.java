package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionType;

import java.util.List;

public record CsQuestionPayloadResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        List<CsQuestionChoiceResponse> choices) {
}
