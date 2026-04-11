package com.peekle.domain.cs.dto.response;

public record CsMyDomainItemResponse(
        CsDomainResponse domain,
        CsProgressResponse progress,
        boolean isCurrent) {
}
