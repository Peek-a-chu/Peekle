package com.peekle.domain.problem.dto;

import com.peekle.domain.problem.entity.Problem;

public record ProblemExternalIdResponse(
        Long id,
        String source,
        String externalId,
        String title,
        String englishTitle,
        String koreanTitle,
        String tier,
        String url
) {
    public static ProblemExternalIdResponse from(Problem problem) {
        return new ProblemExternalIdResponse(
                problem.getId(),
                problem.getSource(),
                problem.getExternalId(),
                problem.getTitle(),
                problem.getEnglishTitle(),
                problem.getKoreanTitle(),
                problem.getTier(),
                problem.getUrl()
        );
    }
}
