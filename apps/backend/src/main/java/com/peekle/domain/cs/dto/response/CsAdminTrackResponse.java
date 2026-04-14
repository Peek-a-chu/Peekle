package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsAdminTrackResponse(
        Long trackId,
        Integer domainId,
        String domainName,
        Integer trackNo,
        String name,
        List<CsAdminStageSummaryResponse> stages) {
}
