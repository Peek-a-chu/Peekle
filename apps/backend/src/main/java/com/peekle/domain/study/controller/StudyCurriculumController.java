package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.service.StudyCurriculumService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyCurriculumController {

    private final StudyCurriculumService studyCurriculumService;
    private final com.peekle.domain.study.service.RedisStudyProblemService redisStudyProblemService;

    /**
     * 커스텀 문제 설명 저장
     */
    @PostMapping("/problems/{studyProblemId}/description")
    public ApiResponse<Void> saveDescription(
            @PathVariable Long studyProblemId,
            @RequestBody java.util.Map<String, String> request) {
        String description = request.get("description");
        redisStudyProblemService.saveDescription(studyProblemId, description);
        return ApiResponse.success();
    }

    /**
     * 커스텀 문제 설명 조회
     */
    @GetMapping("/problems/{studyProblemId}/description")
    public ApiResponse<String> getDescription(@PathVariable Long studyProblemId) {
        String description = redisStudyProblemService.getDescription(studyProblemId);
        return ApiResponse.success(description);
    }

    /**
     * 일별 문제 및 풀이 현황 조회
     * GET /api/studies/{id}/curriculum/daily?date=2026-01-26
     */
    @GetMapping("/{studyId}/curriculum/daily")
    public ApiResponse<List<ProblemStatusResponse>> getDailyCurriculum(
            @PathVariable Long studyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Long userId) {

        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        List<ProblemStatusResponse> response = studyCurriculumService.getDailyProblems(userId, studyId, targetDate);

        System.out.println("DEBUG DailyCurriculum: " + response.toString());
        return ApiResponse.success(response);
    }
}
