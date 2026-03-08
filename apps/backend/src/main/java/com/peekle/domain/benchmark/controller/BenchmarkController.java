package com.peekle.domain.benchmark.controller;

import com.peekle.domain.benchmark.service.BenchmarkFixtureService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Profile("benchmark")
@RequiredArgsConstructor
@RequestMapping("/api/benchmark")
public class BenchmarkController {

    private final BenchmarkFixtureService benchmarkFixtureService;

    @PostMapping("/problems/ensure")
    public ApiResponse<BenchmarkProblemSeedResponse> ensureProblems(@RequestParam int count) {
        List<Long> problemIds = benchmarkFixtureService.ensureProblemIds(count);
        return ApiResponse.success(new BenchmarkProblemSeedResponse(problemIds.size(), problemIds));
    }

    @PostMapping("/fixtures/start")
    public ApiResponse<BenchmarkFixtureService.StartFixtures> createStartFixtures(
            @RequestBody BenchmarkFixtureService.BenchmarkFixtureCommand command) {
        return ApiResponse.success(benchmarkFixtureService.createStartFixtures(command));
    }

    @PostMapping("/fixtures/create-room")
    public ApiResponse<BenchmarkFixtureService.CreateRoomFixtures> createCreateRoomFixtures(
            @RequestBody BenchmarkFixtureService.BenchmarkFixtureCommand command) {
        return ApiResponse.success(benchmarkFixtureService.createCreateRoomFixtures(command));
    }

    @PostMapping("/fixtures/finish-race")
    public ApiResponse<BenchmarkFixtureService.FinishRaceFixtures> createFinishRaceFixtures(
            @RequestBody BenchmarkFixtureService.FinishRaceFixtureCommand command) {
        return ApiResponse.success(benchmarkFixtureService.createFinishRaceFixtures(command));
    }

    @PostMapping("/games/{roomId}/ready")
    public ApiResponse<BenchmarkRoomActionResponse> ready(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Long userId) {
        Long requiredUserId = requireUserId(userId);
        benchmarkFixtureService.toggleReady(roomId, requiredUserId);
        return ApiResponse.success(new BenchmarkRoomActionResponse(roomId, requiredUserId, "READY_TOGGLED"));
    }

    @PostMapping("/games/{roomId}/start")
    public ApiResponse<BenchmarkRoomActionResponse> start(
            @PathVariable Long roomId,
            @AuthenticationPrincipal Long userId) {
        Long requiredUserId = requireUserId(userId);
        benchmarkFixtureService.startGame(roomId, requiredUserId);
        return ApiResponse.success(new BenchmarkRoomActionResponse(roomId, requiredUserId, "STARTED"));
    }

    @DeleteMapping("/games/{roomId}/preview")
    public ApiResponse<BenchmarkPreviewResponse> evictPreview(@PathVariable Long roomId) {
        benchmarkFixtureService.evictWorkbookPreview(roomId);
        return ApiResponse.success(new BenchmarkPreviewResponse(roomId, true));
    }

    private Long requireUserId(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }

    public record BenchmarkProblemSeedResponse(int count, List<Long> problemIds) {
    }

    public record BenchmarkRoomActionResponse(Long roomId, Long userId, String action) {
    }

    public record BenchmarkPreviewResponse(Long roomId, boolean evicted) {
    }
}
