package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsAdminTrackResponse(
        Long trackId,
        Integer domainId,
        Integer trackNo,
        String name,
        List<Long> stageIds) {
}
