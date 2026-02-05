package com.peekle.domain.workbook.dto.response;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkbookProblemResponse {
    // 필요한 정보만 골라서, frontend측으로 보내기
    private Long id;
    private int number;
    private String title;
    private String tier;
    private String url;
    private boolean isSolved; // Legacy, keep for compatibility if needed
    private String status; // SUCCESS, FAIL, NONE

    public static WorkbookProblemResponse of(WorkbookProblem workbookProblem, String status) {
        Problem problem = workbookProblem.getProblem();

        return WorkbookProblemResponse.builder()
                .id(problem.getId())
                .number(Integer.parseInt(problem.getExternalId()))
                .title(problem.getTitle())
                .tier(problem.getTier())
                .url(problem.getUrl())
                .isSolved("SUCCESS".equals(status))
                .status(status)
                .build();
    }

}
