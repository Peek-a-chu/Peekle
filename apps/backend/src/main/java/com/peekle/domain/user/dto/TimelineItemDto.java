package com.peekle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TimelineItemDto {
    private Long submissionId;
    private String problemId;
    private String title;
    private String tier;
    private Integer tierLevel;
    private String link;
    private String tag; // [팀] 게임방 이름 etc.
    private String sourceType; // EXTENSION, STUDY, GAME
    private String language; // python, java, etc.
    private Integer memory; // KB
    private Integer executionTime; // ms
    private String submittedAt;
}
