package com.peekle.domain.workbook.dto.response;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkbookProblemResponse {
    private Long id;
    private int number;
    private String title;
    private String tier;
    private String url;

    public static WorkbookProblemResponse of(WorkbookProblem workbookProblem) {
        Problem problem = workbookProblem.getProblem();
        return WorkbookProblemResponse.builder()
                .id(problem.getId())
                .number(Integer.parseInt(problem.getExternalId()))
                .title(problem.getTitle())
                .tier(problem.getTier())
                .url(problem.getUrl())
                .build();
    }
}
