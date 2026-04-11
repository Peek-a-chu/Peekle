package com.peekle.domain.cs.controller;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.request.CsDomainIdRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.dto.response.CsMyDomainItemResponse;
import com.peekle.domain.cs.service.CsAttemptService;
import com.peekle.domain.cs.service.CsDomainService;
import com.peekle.global.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cs")
public class CsController {

    private final CsDomainService csDomainService;
    private final CsAttemptService csAttemptService;

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
}
