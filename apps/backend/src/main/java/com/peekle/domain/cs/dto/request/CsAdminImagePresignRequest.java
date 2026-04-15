package com.peekle.domain.cs.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CsAdminImagePresignRequest(
        @NotBlank(message = "fileName은 필수입니다.")
        String fileName,
        @NotBlank(message = "contentType은 필수입니다.")
        String contentType) {
}

