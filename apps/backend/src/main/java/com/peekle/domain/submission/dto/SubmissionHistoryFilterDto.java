package com.peekle.domain.submission.dto;

import com.peekle.domain.submission.enums.SourceType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SubmissionHistoryFilterDto {
    private Long userId;
    private String nickname;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String tier;
    private SourceType sourceType;
    private Boolean isSuccess;
}
