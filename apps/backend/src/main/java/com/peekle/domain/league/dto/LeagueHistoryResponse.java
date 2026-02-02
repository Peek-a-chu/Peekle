package com.peekle.domain.league.dto;

import com.peekle.domain.league.entity.LeagueHistory;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LeagueHistoryResponse {
    private Long id;
    private String league;
    private Integer finalPoint;
    private String result; // PROMOTED, DEMOTED, STAY, MAINTAINED
    private Integer seasonWeek;
    private Integer rank;
    private String currentLeague;

    public static LeagueHistoryResponse from(LeagueHistory history) {
        return LeagueHistoryResponse.builder()
                .id(history.getId())
                .league(history.getLeague().name())
                .finalPoint(history.getFinalPoint())
                .result(history.getResult())
                .seasonWeek(history.getSeasonWeek())
                .rank(history.getRank())
                .currentLeague(history.getUser().getLeague().name())
                .build();
    }
}
