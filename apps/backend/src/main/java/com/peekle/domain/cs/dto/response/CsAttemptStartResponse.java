package com.peekle.domain.cs.dto.response;

public record CsAttemptStartResponse(
        Long stageId,
        CsQuestionPayloadResponse firstQuestion) {
}
