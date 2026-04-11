package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsStageStatus;

public record CsStageStatusResponse(
        Long stageId,
        Integer stageNo,
        CsStageStatus status,
        String lockReason) {
}
