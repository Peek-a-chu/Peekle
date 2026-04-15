package com.peekle.domain.cs.controller;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.request.CsDomainIdRequest;
import com.peekle.domain.cs.dto.request.CsWrongReviewAnswerRequest;
import com.peekle.domain.cs.dto.request.CsWrongReviewStartRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.dto.response.CsMyDomainItemResponse;
import com.peekle.domain.cs.dto.response.CsPastExamCatalogResponse;
import com.peekle.domain.cs.dto.response.CsTrackSkipResponse;
import com.peekle.domain.cs.dto.response.CsWrongProblemPageResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewAnswerResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewCompleteResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewStartResponse;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.cs.service.CsAttemptService;
import com.peekle.domain.cs.service.CsDomainService;
import com.peekle.domain.cs.service.CsPastExamService;
import com.peekle.domain.cs.service.CsWrongProblemService;
import com.peekle.global.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cs")
public class CsController {

    private final CsDomainService csDomainService;
    private final CsAttemptService csAttemptService;
    private final CsWrongProblemService csWrongProblemService;
    private final CsPastExamService csPastExamService;

    @GetMapping("/bootstrap")
    public ApiResponse<CsBootstrapResponse> getBootstrap(@AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csDomainService.getBootstrap(userId));
    }

    @GetMapping("/domains")
    public ApiResponse<List<CsDomainResponse>> getAvailableDomains(@AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csDomainService.getAvailableDomains(userId));
    }

    @GetMapping("/me/domains")
    public ApiResponse<List<CsMyDomainItemResponse>> getMyDomains(@AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csDomainService.getMyDomains(userId));
    }

    @PostMapping("/me/domains")
    public ApiResponse<CsDomainSubmitResponse> addMyDomain(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CsDomainIdRequest request) {
        return ApiResponse.success(csDomainService.addMyDomain(userId, request.domainId()));
    }

    @PutMapping("/me/current-domain")
    public ApiResponse<CsCurrentDomainChangeResponse> changeCurrentDomain(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CsDomainIdRequest request) {
        return ApiResponse.success(csDomainService.changeCurrentDomain(userId, request.domainId()));
    }

    @PostMapping("/stages/{stageId}/attempt/start")
    public ApiResponse<CsAttemptStartResponse> startStageAttempt(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId) {
        return ApiResponse.success(csAttemptService.startStageAttempt(userId, stageId));
    }

    @GetMapping("/past-exams")
    public ApiResponse<CsPastExamCatalogResponse> getPastExamCatalog(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csPastExamService.getPastExamCatalog(userId));
    }

    @PostMapping("/past-exams/{year}/rounds/{roundNo}/attempt/start")
    public ApiResponse<CsAttemptStartResponse> startPastExamAttempt(
            @AuthenticationPrincipal Long userId,
            @PathVariable Integer year,
            @PathVariable Integer roundNo) {
        return ApiResponse.success(csPastExamService.startPastExamAttemptByRound(userId, year, roundNo));
    }

    @PostMapping("/stages/{stageId}/attempt/answer")
    public ApiResponse<CsAttemptAnswerResponse> submitStageAnswer(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId,
            @Valid @RequestBody CsAttemptAnswerRequest request) {
        return ApiResponse.success(csAttemptService.submitAnswer(userId, stageId, request));
    }

    @PostMapping("/stages/{stageId}/attempt/complete")
    public ApiResponse<CsAttemptCompleteResponse> completeStageAttempt(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId) {
        return ApiResponse.success(csAttemptService.completeAttempt(userId, stageId));
    }

    @PostMapping("/tracks/current/skip")
    public ApiResponse<CsTrackSkipResponse> skipCurrentTrack(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csAttemptService.skipCurrentTrack(userId));
    }

    @GetMapping("/wrong-problems")
    public ApiResponse<CsWrongProblemPageResponse> getWrongProblems(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Integer domainId,
            @RequestParam(required = false) Long stageId,
            @RequestParam(required = false, defaultValue = "ACTIVE") CsWrongProblemStatus status,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size) {
        return ApiResponse.success(csWrongProblemService.getWrongProblems(
                userId,
                domainId,
                stageId,
                status,
                page == null ? 0 : page,
                size == null ? 20 : size));
    }

    @PostMapping("/wrong-problems/review/start")
    public ApiResponse<CsWrongReviewStartResponse> startWrongReview(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody(required = false) CsWrongReviewStartRequest request) {
        return ApiResponse.success(csWrongProblemService.startWrongReview(userId, request));
    }

    @PostMapping("/wrong-problems/review/{reviewId}/answer")
    public ApiResponse<CsWrongReviewAnswerResponse> submitWrongReviewAnswer(
            @AuthenticationPrincipal Long userId,
            @PathVariable String reviewId,
            @Valid @RequestBody CsWrongReviewAnswerRequest request) {
        return ApiResponse.success(csWrongProblemService.submitWrongReviewAnswer(userId, reviewId, request));
    }

    @PostMapping("/wrong-problems/review/{reviewId}/complete")
    public ApiResponse<CsWrongReviewCompleteResponse> completeWrongReview(
            @AuthenticationPrincipal Long userId,
            @PathVariable String reviewId) {
        return ApiResponse.success(csWrongProblemService.completeWrongReview(userId, reviewId));
    }
}
