package com.peekle.domain.workbook.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.peekle.domain.workbook.entity.Workbook;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class WorkbookResponse {
    private Long id;
    private String title;
    private String description;
    private int problemCount;
    private int solvedCount;
    private int bookmarkCount;

    @JsonProperty("isBookmarked")
    private boolean isBookmarked;

    @JsonProperty("isOwner")
    private boolean isOwner;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private CreatorInfo creator;
    private List<WorkbookProblemResponse> problems;

    @Getter
    @Builder
    public static class CreatorInfo {
        private Long id;
        private String nickname;
    }

    public static WorkbookResponse of(Workbook workbook, boolean isBookmarked, boolean isOwner, int solvedCount,
            List<WorkbookProblemResponse> problems) {
        return WorkbookResponse.builder()
                .id(workbook.getId())
                .title(workbook.getTitle())
                .description(workbook.getDescription())
                .problemCount(problems != null ? problems.size() : 0)
                .solvedCount(solvedCount)
                .bookmarkCount(workbook.getBookmarkCount())
                .isBookmarked(isBookmarked)
                .isOwner(isOwner)
                .createdAt(workbook.getCreatedAt())
                .updatedAt(workbook.getUpdatedAt())
                .creator(CreatorInfo.builder()
                        .id(workbook.getCreator().getId())
                        .nickname(workbook.getCreator().getNickname())
                        .build())
                .problems(problems)
                .build();
    }
}
