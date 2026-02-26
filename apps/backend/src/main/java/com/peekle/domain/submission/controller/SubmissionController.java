package com.peekle.domain.submission.controller;

import com.peekle.domain.submission.dto.SubmissionLogResponse;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.domain.submission.service.SubmissionService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/{submissionId}")
    public ApiResponse<SubmissionResponse> getSubmission(@PathVariable Long submissionId) {
        SubmissionResponse response = submissionService.getSubmissionDetail(submissionId);
        return ApiResponse.success(response);
    }

    @GetMapping("/studies/{studyId}/problems/{problemId}")
    public ApiResponse<Page<SubmissionLogResponse>> getStudyProblemSubmissions(
            @PathVariable Long studyId,
            @PathVariable Long problemId,
            @PageableDefault(size = 5) Pageable pageable) {

        Page<SubmissionLogResponse> page = submissionService
                .getStudyProblemSubmissions(studyId, problemId, pageable);

        return ApiResponse.success(page);
    }
}
