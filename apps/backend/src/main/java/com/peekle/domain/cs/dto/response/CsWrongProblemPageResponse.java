package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsWrongProblemPageResponse(
        List<CsWrongProblemItemResponse> content,
        Integer page,
        Integer size,
        Long totalElements) {
}
