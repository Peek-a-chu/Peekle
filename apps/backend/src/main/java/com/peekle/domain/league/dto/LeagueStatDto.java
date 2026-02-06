package com.peekle.domain.league.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LeagueStatDto {
    private String tier;
    private int count;
    private double percentile; // 해당 티어의 상위 % (누적 비율)
}
