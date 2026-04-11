package com.peekle.domain.cs.dto.response;

public record CsBootstrapResponse(
        boolean needsDomainSelection,
        CsDomainResponse currentDomain,
        CsProgressResponse progress) {
}
