package com.peekle.domain.problem.controller;

import com.peekle.domain.problem.dto.ProblemSearchResponse;
import com.peekle.domain.problem.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/search")
    public ResponseEntity<List<ProblemSearchResponse>> searchProblems(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit
    ) {
        List<ProblemSearchResponse> results = problemService.searchProblems(keyword, limit);
        return ResponseEntity.ok(results);
    }
}
