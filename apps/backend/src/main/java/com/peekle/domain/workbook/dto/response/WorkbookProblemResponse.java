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
    private boolean isSolved;

    public static WorkbookProblemResponse of(WorkbookProblem workbookProblem, boolean isSolved) {
        // [1] @Builder를 사용해서 WorkbookProblemResponse 객체의 껍데기만 생성
        Problem problem = workbookProblem.getProblem();

        // [2] @Builder를 사용해서 껍데기에 내용을 채워넣음
        /*
         * @Builder는 Lombok이라는 라이브러리 기능임
         * 
         * Builder가 없으면,
         * 하나하나 set으로 설정해줘야함.
         * WorkbookProblemResponse response = new WorkbookProblemResponse();
         * response.setId(1L);
         * response.setNumber(1234);
         * response.setTitle("두 수의 합");
         * response.setTier("Silver IV");
         * response.setUrl("https://...");
         * 
         * @Builder를 사용하면,
         * WorkbookProblemResponse response = WorkbookProblemResponse.builder()
         * .id(1L)
         * .number(1234)
         * .title("두 수의 합")
         * .tier("Silver IV")
         * .url("https://...")
         * .build();
         */

        // [3] 생성된 객체를 반환
        return WorkbookProblemResponse.builder()
                .id(problem.getId())
                .number(Integer.parseInt(problem.getExternalId()))
                .title(problem.getTitle())
                .tier(problem.getTier())
                .url(problem.getUrl())
                .isSolved(isSolved)
                .build();
        /*
         * 참고로,
         * {
         * "id": 1,
         * "number": 1234,
         * "title": "두 수의 합",
         * "tier": "Silver IV",
         * "url": "https://...",
         * "isSolved": true // ← 새로 추가된 필드!
         * }
         */
    }

}
