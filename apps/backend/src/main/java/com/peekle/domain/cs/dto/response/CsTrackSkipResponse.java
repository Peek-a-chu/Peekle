package com.peekle.domain.cs.dto.response;

public record CsTrackSkipResponse(
        Integer skippedTrackNo,
        Integer nextTrackNo,
        Integer nextStageNo,
        Long nextStageId,
        Boolean isCurriculumCompleted) {
}
