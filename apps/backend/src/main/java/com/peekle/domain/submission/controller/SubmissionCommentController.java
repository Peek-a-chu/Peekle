package com.peekle.domain.submission.controller;

import com.peekle.domain.submission.dto.SubmissionCommentCreateRequest;
import com.peekle.domain.submission.dto.SubmissionCommentResponse;
import com.peekle.domain.submission.dto.SubmissionCommentUpdateRequest;
import com.peekle.domain.submission.service.SubmissionCommentService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies/{studyId}/submissions/{submissionId}/comments")
public class SubmissionCommentController {

    private final SubmissionCommentService submissionCommentService;

    @GetMapping
    public ApiResponse<List<SubmissionCommentResponse>> getSubmissionComments(
            @PathVariable Long studyId,
            @PathVariable Long submissionId,
            @AuthenticationPrincipal Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return ApiResponse.success(submissionCommentService.getComments(studyId, submissionId, userId));
    }

    @PostMapping
    public ApiResponse<SubmissionCommentResponse> createSubmissionComment(
            @PathVariable Long studyId,
            @PathVariable Long submissionId,
            @AuthenticationPrincipal Long userId,
            @RequestBody SubmissionCommentCreateRequest request) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return ApiResponse.success(
                submissionCommentService.createComment(studyId, submissionId, userId, request));
    }

    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteSubmissionComment(
            @PathVariable Long studyId,
            @PathVariable Long submissionId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        submissionCommentService.deleteComment(studyId, submissionId, commentId, userId);
        return ApiResponse.success();
    }

    @PatchMapping("/{commentId}")
    public ApiResponse<SubmissionCommentResponse> updateSubmissionComment(
            @PathVariable Long studyId,
            @PathVariable Long submissionId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal Long userId,
            @RequestBody SubmissionCommentUpdateRequest request) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return ApiResponse.success(
                submissionCommentService.updateComment(studyId, submissionId, commentId, userId, request));
    }
}
