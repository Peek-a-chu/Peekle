package com.peekle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TimelineItemDto {
    private String timelineKey;
    private String activityType; // SUBMISSION, CS_STAGE
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
    private String result; // 제출 결과 (맞았습니다, 틀렸습니다 등)
    private Boolean isSuccess; // 성공 여부
    private String submittedAt;

    // CS 학습 타임라인용 필드
    private String csDomainName;
    private Integer csTrackNo;
    private Integer csStageNo;
    private Integer csCorrectCount;
    private Integer csTotalCount;
}
