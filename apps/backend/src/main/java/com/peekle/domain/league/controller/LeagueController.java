package com.peekle.domain.league.controller;

import com.peekle.domain.league.dto.*;
import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.league.service.LeagueService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/league")
public class LeagueController {

    private final LeagueService leagueService;
    // UserRepository is no longer needed

    @GetMapping("/my-status")
    public ApiResponse<LeagueStatusResponse> getMyLeagueStatus(@AuthenticationPrincipal Long userId) {

        return ApiResponse.success(leagueService.getMyLeagueStatus(userId));
    }

    @GetMapping("/rules")
    public ApiResponse<Map<String, Map<String, Integer>>> getLeagueRules() {
        Map<String, Map<String, Integer>> rules = java.util.Arrays
                .stream(LeagueTier.values())
                .collect(java.util.stream.Collectors.toMap(
                        tier -> tier.name().toLowerCase(),
                        tier -> java.util.Map.of(
                                "promotePercent", tier.getPromotePercent(),
                                "demotePercent", tier.getDemotePercent())));
        return ApiResponse.success(rules);
    }

    @GetMapping("/weekly-summary")
    public ApiResponse<WeeklyPointSummaryResponse> getWeeklyPointSummary(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ApiResponse.success(leagueService.getWeeklyPointSummary(userId, date));
    }

    @GetMapping("/progress")
    public ApiResponse<List<LeagueProgressResponse>> getLeagueProgress(
            @AuthenticationPrincipal Long userId) {

        return ApiResponse.success(leagueService.getLeagueProgress(userId));
    }

    @GetMapping("/history/unviewed")
    public ApiResponse<LeagueHistoryResponse> getUnviewedHistory(
            @AuthenticationPrincipal Long userId) {

        return ApiResponse.success(leagueService.getUnviewedHistory(userId));
    }

    @PostMapping("/history/{historyId}/view")
    public ApiResponse<Void> markHistoryAsViewed(@AuthenticationPrincipal Long userId,
            @PathVariable Long historyId) {

        leagueService.markHistoryAsViewed(historyId, userId);
        return ApiResponse.success(null);
    }

    @GetMapping("/history/{historyId}/ranking")
    public ApiResponse<List<LeagueRankingMemberDto>> getHistoryRanking(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long historyId) {

        return ApiResponse.success(leagueService.getLeagueHistoryRanking(historyId, userId));
    }
}