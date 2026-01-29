package com.peekle.domain.league.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class LeagueProgressResponse {
    private String league;
    private int score;
    private LocalDate date;
    private LocalDate periodEnd;
    private int leagueIndex;
}
