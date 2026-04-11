package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CsDomainIdRequest(
        @NotNull(message = "domainId는 필수입니다.")
        @Positive(message = "domainId는 1 이상의 값이어야 합니다.")
        Integer domainId) {
}
