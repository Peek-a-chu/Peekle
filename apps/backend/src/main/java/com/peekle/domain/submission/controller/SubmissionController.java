package com.peekle.domain.submission.controller;

import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.peekle.domain.submission.service.SubmissionService;
import com.peekle.domain.submission.dto.SubmissionResponse;
import org.springframework.http.ResponseEntity;

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
}
