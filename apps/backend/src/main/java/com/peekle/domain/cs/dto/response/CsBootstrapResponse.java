package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsBootstrapResponse(
        boolean needsDomainSelection,
        CsDomainResponse currentDomain,
        CsProgressResponse progress,
        List<CsStageStatusResponse> stages) {
}
