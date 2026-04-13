package com.peekle.domain.cs.dto.response;

public record CsAdminClaimItemResponse(
        String claimId,
        Long questionId,
        String reason,
        String status,
        String createdAt) {
}
