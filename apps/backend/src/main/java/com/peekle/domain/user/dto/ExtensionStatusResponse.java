package com.peekle.domain.user.dto;

import com.peekle.domain.league.enums.LeagueStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExtensionStatusResponse {
    private Integer streakCurrent;
    private Boolean isSolvedToday;
    private Integer groupRank; // 그룹 내 순위
    private LeagueStatus leagueStatus; // 승급/유지/강등 상태
    private String bojId;
}
