package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsAdminClaimOverviewPageResponse(
        List<CsAdminClaimOverviewItemResponse> content,
        Integer page,
        Integer size,
        Long totalElements) {
}
