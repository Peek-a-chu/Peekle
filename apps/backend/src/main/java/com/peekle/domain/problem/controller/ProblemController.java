package com.peekle.domain.problem.controller;

import com.peekle.domain.problem.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
