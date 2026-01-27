package com.peekle.domain.league.controller;

import com.peekle.domain.league.dto.LeagueStatusResponse;
import com.peekle.domain.league.service.LeagueService;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/league")
public class LeagueController {

    private final LeagueService leagueService;
    private final UserRepository userRepository;

    @GetMapping("/my-status")
    public ApiResponse<LeagueStatusResponse> getMyLeagueStatus(@AuthenticationPrincipal Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID from token is null");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
                
        LeagueStatusResponse response = leagueService.getMyLeagueStatus(user);
        return ApiResponse.success(response);
    }
    @GetMapping("/rules")
    public ApiResponse<Map<String, Map<String, Integer>>> getLeagueRules() {
        Map<String, Map<String, Integer>> rules = java.util.Arrays.stream(com.peekle.domain.league.enums.LeagueTier.values())
                .collect(java.util.stream.Collectors.toMap(
                        tier -> tier.name().toLowerCase(),
                        tier -> java.util.Map.of(
                                "promotePercent", tier.getPromotePercent(),
                                "demotePercent", tier.getDemotePercent()
                        )
                ));
        return ApiResponse.success(rules);
    }
}

