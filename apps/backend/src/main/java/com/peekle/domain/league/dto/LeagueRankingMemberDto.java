package com.peekle.domain.league.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.peekle.domain.league.enums.LeagueStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LeagueRankingMemberDto {
    private int rank;
    private String name;
    private String avatar;
    private String profileImgThumb;
    private int score;
    private LeagueStatus status;
    
    @JsonProperty("me")
    private boolean me;
}
