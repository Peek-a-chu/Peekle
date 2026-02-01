package com.peekle.domain.search.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SearchResponse {

    private String category;
    private SearchCounts counts;
    private SearchData data;
    private PageInfo pagination;

    @Getter @Builder
    public static class SearchCounts {
        private long problem;
        private long workbook;
        private long user;
    }
    @Getter @Builder
    public static class SearchData {
        private List<SearchProblemResponse> problems;
        private List<SearchWorkbookResponse> workbooks;
        private List<SearchUserResponse> users;
    }

    @Getter @Builder
    public static class PageInfo {
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
}
