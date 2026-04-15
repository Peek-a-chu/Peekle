package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionClaimStatus;
import com.peekle.domain.cs.enums.CsQuestionClaimType;

import java.time.LocalDateTime;

public record CsQuestionClaimSubmitResponse(
        Long claimId,
        Long questionId,
        CsQuestionClaimType claimType,
        CsQuestionClaimStatus status,
        LocalDateTime createdAt) {
}
