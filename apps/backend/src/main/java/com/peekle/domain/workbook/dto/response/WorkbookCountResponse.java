package com.peekle.domain.workbook.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorkbookCountResponse {
    private long all;
    private long my;
    private long bookmarked;

    public static WorkbookCountResponse of(long all, long my, long bookmarked) {
        return WorkbookCountResponse.builder()
                .all(all)
                .my(my)
                .bookmarked(bookmarked)
                .build();
    }
}
