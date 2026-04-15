package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsTrackLearningMode;
import java.util.List;

public record CsAdminTrackResponse(
        Long trackId,
        Integer domainId,
        String domainName,
        Integer trackNo,
        String name,
        CsTrackLearningMode learningMode,
        Integer examYear,
        List<CsAdminStageSummaryResponse> stages) {
}
