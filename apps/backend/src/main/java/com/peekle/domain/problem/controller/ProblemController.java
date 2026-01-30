package com.peekle.domain.problem.controller;

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
        // 비동기로 실행
        new Thread(() -> problemService.fetchAndSaveAllProblems(startPage)).start();
        
        return ResponseEntity.ok("🚀 Problem sync started from Page " + startPage);
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

    /**
     * title 또는 externalId로 문제 검색
     * GET /api/problems/search?query=1000&source=BOJ
     * 또는
     * GET /api/problems/search?query=A+B&source=BOJ
     */
    @GetMapping("/search")
    public ApiResponse<List<Map<String, Object>>> searchProblems(
            @RequestParam String query,
            @RequestParam(defaultValue = "BOJ") String source
    ) {
        List<Map<String, Object>> response = problemService.searchProblems(query, source);
        return ApiResponse.success(response);
    }
}
