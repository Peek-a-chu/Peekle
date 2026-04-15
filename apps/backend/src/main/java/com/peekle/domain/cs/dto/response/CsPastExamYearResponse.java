package com.peekle.domain.cs.dto.response;

import java.util.List;

public record CsPastExamYearResponse(
        Integer year,
        List<CsPastExamRoundResponse> rounds) {
}
