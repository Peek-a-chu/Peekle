package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsAdminClaimsPlaceholderResponse(
        Long stageId,
        int totalClaims,
        String message,
        List<CsAdminClaimItemResponse> items) {
}
