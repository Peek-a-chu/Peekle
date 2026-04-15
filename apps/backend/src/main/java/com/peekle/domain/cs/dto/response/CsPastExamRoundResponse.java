package com.peekle.domain.cs.dto.response;

public record CsPastExamRoundResponse(
        Integer roundNo,
        Long stageId,
        Integer questionCount,
        Boolean isReady) {
}
