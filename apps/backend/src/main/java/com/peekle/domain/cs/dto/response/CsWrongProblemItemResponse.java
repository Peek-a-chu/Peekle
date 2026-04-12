package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;

import java.time.LocalDateTime;

public record CsWrongProblemItemResponse(
        Long questionId,
        CsQuestionType questionType,
        String prompt,
        String correctAnswer,
        Integer domainId,
        String domainName,
        Integer trackNo,
        Long stageId,
        Integer stageNo,
        CsWrongProblemStatus status,
        LocalDateTime lastWrongAt,
        LocalDateTime clearedAt) {
}
