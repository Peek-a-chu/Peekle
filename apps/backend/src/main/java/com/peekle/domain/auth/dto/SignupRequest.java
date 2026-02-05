package com.peekle.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SignupRequest(
        @NotBlank String token,
        @NotBlank String nickname,
        String bojId
) {
}
