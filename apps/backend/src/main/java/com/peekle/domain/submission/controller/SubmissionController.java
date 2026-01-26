package com.peekle.domain.submission.controller;

import com.peekle.domain.submission.dto.SubmissionLogResponse;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.domain.submission.service.SubmissionService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping("/")
    public ApiResponse<SubmissionResponse> createGeneralSubmission(@RequestBody SubmissionRequest request) {
        SubmissionResponse response = submissionService.saveGeneralSubmission(request);
        System.out.println("Received Extension Submission: " + request);
        return ApiResponse.success(response);
    }

    /**
     * 특정 스터디, 특정 문제의 성공한 제출 목록 조회
     * GET /api/submissions/study/{studyId}/problem/{problemId}
     */
    @GetMapping("/study/{studyId}/problem/{problemId}")
    public ApiResponse<List<SubmissionLogResponse>> getStudyProblemSubmissions(
            @PathVariable Long studyId,
            @PathVariable Long problemId) {

        List<SubmissionLogResponse> response = submissionService
                .getStudyProblemSubmissions(studyId, problemId);
        return ApiResponse.success(response);
    }

    /**
     * 특정 제출 내역 상세 조회 (코드 포함)
     * GET /api/submissions/{submissionId}
     */
    @GetMapping("/{submissionId}")
    public ApiResponse<SubmissionResponse> getSubmissionDetail(
            @PathVariable Long submissionId) {

        SubmissionResponse response = submissionService.getSubmissionDetail(submissionId);
        return ApiResponse.success(response);
    }
}
