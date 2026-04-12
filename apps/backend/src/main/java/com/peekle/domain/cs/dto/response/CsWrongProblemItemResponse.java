package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;

import java.time.LocalDateTime;

public record CsWrongProblemItemResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        Integer domainId,
        String domainName,
        Integer trackNo,
        Long stageId,
        Integer stageNo,
        CsWrongProblemStatus status,
        Integer wrongCount,
        Integer reviewCorrectCount,
        LocalDateTime lastWrongAt,
        LocalDateTime clearedAt) {
}
