package com.peekle.domain.cs.dto.response;

public record CsProgressResponse(
        Integer currentTrackNo,
        String currentTrackName,
        Integer currentStageNo) {
}
