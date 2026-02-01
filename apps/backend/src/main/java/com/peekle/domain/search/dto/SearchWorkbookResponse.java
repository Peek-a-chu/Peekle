package com.peekle.domain.search.dto;

import com.peekle.domain.workbook.entity.Workbook;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchWorkbookResponse {

    private Long workbookId;
    private String title;
    private String description;

    private Long creatorId;
    private String creatorNickname;
    private String creatorProfileImg;
    private int bookmarkCount;
    private int problemCount;

    public static SearchWorkbookResponse from(Workbook workbook) {
        return SearchWorkbookResponse.builder()
                .workbookId(workbook.getId())
                .title(workbook.getTitle())
                .description(workbook.getDescription())
                .creatorId(workbook.getCreator().getId())
                .creatorNickname(workbook.getCreator().getNickname())
                .creatorProfileImg(workbook.getCreator().getProfileImg())
                .bookmarkCount(workbook.getBookmarkCount())
                // WorkbookProblems 리스트 크기 반환 (Lazy Loading 주의 필요, Batch Fetch 권장)
                .problemCount(workbook.getProblems() != null ? workbook.getProblems().size() : 0)
                .build();
    }
}
