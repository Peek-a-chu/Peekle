package com.peekle.domain.problem.controller;

import com.peekle.domain.problem.dto.ProblemSearchResponse;
import com.peekle.domain.problem.service.ProblemService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemService problemService;

    @PostMapping("/sync")
    public ResponseEntity<String> syncProblems(
            @RequestParam(defaultValue = "1") int startPage
    ) {
        new Thread(() -> problemService.fetchAndSaveAllProblems(startPage)).start();
        return ResponseEntity.ok("🚀 Problem sync started from Page " + startPage);
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
            @RequestParam(defaultValue = "10") int limit
    ) {
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
            @RequestParam(defaultValue = "BOJ") String source
    ) {
        Map<String, Long> response = problemService.getProblemIdByExternalId(externalId, source);
        return ApiResponse.success(response);
    }
}
