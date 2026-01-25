package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.service.StudyCurriculumService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyCurriculumController {

    private final StudyCurriculumService studyCurriculumService;

    /**
     * 일별 문제 및 풀이 현황 조회
     * GET /api/studies/{id}/curriculum/daily?date=2026-01-26
     */
    @GetMapping("/{studyId}/curriculum/daily")
    public ApiResponse<List<ProblemStatusResponse>> getDailyCurriculum(
            @PathVariable Long studyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId) {

        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        List<ProblemStatusResponse> response = studyCurriculumService.getDailyProblems(userId, studyId, targetDate);

        System.out.println("DEBUG DailyCurriculum: " + response.toString());
        return ApiResponse.success(response);
    }
}
