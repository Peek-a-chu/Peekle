package com.peekle.domain.rank.controller;

import com.peekle.domain.rank.dto.RankResponse;
import com.peekle.domain.rank.service.RankService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ranks")
public class RankController {

    private final RankService rankService;

    @GetMapping()
    public ApiResponse<Page<RankResponse>> getRankings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "ALL") String scope,
            @AuthenticationPrincipal Long userId
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RankResponse> response = rankService.getRanking(userId, keyword, scope, pageable);

        return ApiResponse.success(response);
    }
}
