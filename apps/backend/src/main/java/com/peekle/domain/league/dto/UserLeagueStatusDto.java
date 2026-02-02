package com.peekle.domain.league.dto;

import com.peekle.domain.league.enums.LeagueStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserLeagueStatusDto {
    private int groupRank;
    private LeagueStatus leagueStatus;
    private Integer pointsToPromotion;
    private Integer pointsToMaintenance;
}
