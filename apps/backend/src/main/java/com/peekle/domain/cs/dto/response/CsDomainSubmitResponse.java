package com.peekle.domain.cs.dto.response;

public record CsDomainSubmitResponse(
        boolean added,
        CsDomainResponse domain,
        CsProgressResponse progress,
        boolean isCurrent) {
}
