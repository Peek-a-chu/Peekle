package com.peekle.domain.auth.dto;

import com.peekle.domain.auth.enums.PreferredRecTier;
import jakarta.validation.constraints.NotBlank;

public record SignupRequest(
        @NotBlank String token,
        @NotBlank String nickname,
        String bojId,
        PreferredRecTier preferredRecTier
) {
}
