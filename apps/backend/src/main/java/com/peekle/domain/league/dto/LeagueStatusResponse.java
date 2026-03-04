package com.peekle.domain.league.dto;

import com.peekle.domain.league.enums.LeagueTier;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LeagueStatusResponse {
    private String myLeague;
    private int myRank;
    private int myScore;
    private String maxLeague;
    private int totalMembers;

    // Rule info
    private int promotePercent;
    private int demotePercent;
    private boolean isGroupAssigned;

    // Additional stat
    private Double myPercentile;
    private List<LeagueStatDto> leagueStats;
    private List<LeagueRankingMemberDto> members;

    public static LeagueStatusResponse from(LeagueTier tier, int rank, int score, String maxLeague, int totalMembers,
            double percentile, List<LeagueStatDto> leagueStats, List<LeagueRankingMemberDto> members,
            boolean isGroupAssigned) {
        return LeagueStatusResponse.builder()
                .myLeague(tier.name().toLowerCase())
                .myRank(rank)
                .myScore(score)
                .maxLeague(maxLeague != null ? maxLeague.toLowerCase() : null)
                .totalMembers(totalMembers)
                .promotePercent(tier.getPromotePercent())
                .demotePercent(tier.getDemotePercent())
                .isGroupAssigned(isGroupAssigned)
                .myPercentile(percentile)
                .leagueStats(leagueStats)
                .members(members)
                .build();
    }
}
