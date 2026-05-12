package com.peekle.domain.submission.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class LeetcodeSubmissionRequest {
    private String extensionToken;
    private String submitId;
    private String result;
    private Boolean isSuccess;
    private String submittedAt;
    private String language;
    private String code;
    private Integer executionTime;
    private Integer runtimeMs;
    private Integer memory;
    private Double memoryMb;

    private String externalId;
    private String problemNumber;
    private String titleSlug;
    private String title;
    private String englishTitle;
    private String koreanTitle;
    private String difficulty;
    private String problemUrl;

    private List<TagRequest> tags = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @ToString
    public static class TagRequest {
        private String key;
        private String name;
    }
}
