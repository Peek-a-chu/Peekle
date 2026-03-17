package com.peekle.domain.problem.controller;

import com.peekle.domain.problem.dto.ProblemSearchResponse;
import com.peekle.domain.problem.service.ProblemService;
import com.peekle.domain.problem.service.ProblemSyncJobService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/problems")
public class ProblemController {

    @Value("${problem.sync.manual.admin-user-id}")
    private Long problemSyncAdminUserId;

    private final ProblemService problemService;
    private final ProblemSyncJobService problemSyncJobService;

    @PostMapping("/sync")
    public ResponseEntity<String> syncProblems(
            HttpServletRequest request,
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "1") int startPage) {
        if (problemSyncAdminUserId == null || problemSyncAdminUserId < 1L) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("❌ Problem sync admin user id is not configured.");
        }

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("❌ Bearer Authorization header is required.");
        }

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("❌ Authentication required.");
        }

        if (!problemSyncAdminUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("❌ Only admin can trigger problem sync.");
        }

        boolean accepted = problemSyncJobService.triggerManualSyncAsync(startPage);
        if (!accepted) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("⚠️ Problem sync is already running.");
        }

        return ResponseEntity.accepted()
                .body("🚀 Problem sync started from Page " + Math.max(startPage, 1));
    }

    /**
     * keyword로 문제 검색 (title 또는 externalId로 검색)
     * GET /api/problems/search?keyword=1000&limit=10
     * 또는
     * GET /api/problems/search?keyword=A+B&limit=10
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProblemSearchResponse>> searchProblems(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit) {
        List<ProblemSearchResponse> results = problemService.searchProblems(keyword, limit);
        return ResponseEntity.ok(results);
    }

    /**
     * externalId로 problemId 조회
     * GET /api/problems/by-external-id?externalId=1000&source=BOJ
     */
    @GetMapping("/by-external-id")
    public ApiResponse<Map<String, Long>> getProblemIdByExternalId(
            @RequestParam String externalId,
            @RequestParam(defaultValue = "BOJ") String source) {
        Map<String, Long> response = problemService.getProblemIdByExternalId(externalId, source);
        return ApiResponse.success(response);
    }

    @GetMapping("/tags")
    public ApiResponse<List<com.peekle.domain.problem.entity.Tag>> getAllTags() {
        return ApiResponse.success(problemService.getAllTags());
    }
}
