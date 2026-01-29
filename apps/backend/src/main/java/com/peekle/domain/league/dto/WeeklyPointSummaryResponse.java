package com.peekle.domain.league.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklyPointSummaryResponse {
    private int totalScore;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<PointActivityDto> activities;
}
