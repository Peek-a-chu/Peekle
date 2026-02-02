package com.peekle.domain.submission.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class SubmissionRequest {
    private Long problemId;
    private String problemTitle;
    private String problemTier;
    private String language;
    private String code;
    private Integer memory;
    private Integer executionTime;
    private String result;
    private Boolean isSuccess; // AC(맞았습니다) 여부
    private String submittedAt;

    // 확장 프로그램에서는 submitId도 보내지만,
    // DB PK는 서비스 내부에서 생성하므로 로깅용이나 중복 체크용으로 받을 수 있음
    private String submitId;

    // User identification from extension
    private String extensionToken;

    // Study/Game Context
    private Long roomId;
    private String sourceType; // STUDY, GAME, EXTENSION
}
