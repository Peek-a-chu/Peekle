package com.peekle.domain.problem.dto;

import com.peekle.domain.problem.entity.Problem;
import lombok.Getter;

@Getter
public class ProblemSearchResponse {
    private final Long id;
    private final String externalId;
    private final String title;
    private final String tier;
    private final String url;

    public ProblemSearchResponse(Problem problem) {
        this.id = problem.getId();
        this.externalId = problem.getExternalId();
        this.title = problem.getTitle();
        this.tier = problem.getTier();
        this.url = problem.getUrl();
    }
}
