package com.peekle.domain.study.dto.ide;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class StudyProblemDraftResponse {
    private Long studyProblemId;
    private String code;
    private String language;
    private LocalDateTime updatedAt;
}
