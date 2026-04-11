package com.peekle.domain.cs.dto.response;

public record CsCurrentDomainChangeResponse(
        CsDomainResponse currentDomain,
        CsProgressResponse progress) {
}
