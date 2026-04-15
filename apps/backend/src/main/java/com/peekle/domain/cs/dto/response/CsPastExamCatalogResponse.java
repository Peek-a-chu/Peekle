package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsPastExamCatalogResponse(
        List<CsPastExamYearResponse> years) {
}
