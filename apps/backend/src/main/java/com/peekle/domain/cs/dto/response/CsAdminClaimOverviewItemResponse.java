package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionClaimStatus;
import com.peekle.domain.cs.enums.CsQuestionClaimType;

public record CsAdminClaimOverviewItemResponse(
        Long claimId,
        Long questionId,
        Integer domainId,
        String domainName,
        Long trackId,
        Integer trackNo,
        String trackName,
        Long stageId,
        Integer stageNo,
        CsQuestionClaimType claimType,
        CsQuestionClaimStatus status,
        String description,
        String createdAt) {
}
