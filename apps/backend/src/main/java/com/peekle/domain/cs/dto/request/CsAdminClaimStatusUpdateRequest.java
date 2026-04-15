package com.peekle.domain.cs.dto.request;

import com.peekle.domain.cs.enums.CsQuestionClaimStatus;
import jakarta.validation.constraints.NotNull;

public record CsAdminClaimStatusUpdateRequest(
        @NotNull CsQuestionClaimStatus status) {
}
