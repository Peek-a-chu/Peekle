package com.peekle.domain.cs.controller;

import com.peekle.domain.cs.dto.request.CsAdminDomainNameRequest;
import com.peekle.domain.cs.dto.request.CsAdminQuestionShortAnswersUpdateRequest;
import com.peekle.domain.cs.dto.request.CsAdminQuestionUpdateRequest;
import com.peekle.domain.cs.dto.request.CsAdminStageQuestionImportRequest;
import com.peekle.domain.cs.dto.request.CsAdminTrackCreateRequest;
import com.peekle.domain.cs.dto.response.CsAdminClaimsPlaceholderResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionImportResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionResponse;
import com.peekle.domain.cs.dto.response.CsAdminTrackResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.service.CsAdminContentService;
import com.peekle.global.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/cs/admin")
public class CsAdminController {

    private final CsAdminContentService csAdminContentService;

    @GetMapping("/domains")
    public ApiResponse<List<CsDomainResponse>> getDomains(@AuthenticationPrincipal Long userId) {
        return ApiResponse.success(csAdminContentService.getDomains(userId));
    }

    @PostMapping("/domains")
    public ApiResponse<CsDomainResponse> createDomain(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CsAdminDomainNameRequest request) {
        return ApiResponse.success(csAdminContentService.createDomain(userId, request));
    }

    @PutMapping("/domains/{domainId}")
    public ApiResponse<CsDomainResponse> renameDomain(
            @AuthenticationPrincipal Long userId,
            @PathVariable Integer domainId,
            @Valid @RequestBody CsAdminDomainNameRequest request) {
        return ApiResponse.success(csAdminContentService.renameDomain(userId, domainId, request));
    }

    @DeleteMapping("/domains/{domainId}")
    public ApiResponse<Void> deleteDomain(
            @AuthenticationPrincipal Long userId,
            @PathVariable Integer domainId) {
        csAdminContentService.deleteDomain(userId, domainId);
        return ApiResponse.success();
    }

    @GetMapping("/domains/{domainId}/tracks")
    public ApiResponse<List<CsAdminTrackResponse>> getTracks(
            @AuthenticationPrincipal Long userId,
            @PathVariable Integer domainId) {
        return ApiResponse.success(csAdminContentService.getTracks(userId, domainId));
    }

    @PostMapping("/domains/{domainId}/tracks")
    public ApiResponse<CsAdminTrackResponse> createTrack(
            @AuthenticationPrincipal Long userId,
            @PathVariable Integer domainId,
            @Valid @RequestBody CsAdminTrackCreateRequest request) {
        return ApiResponse.success(csAdminContentService.createTrack(userId, domainId, request));
    }

    @PutMapping("/tracks/{trackId}")
    public ApiResponse<CsAdminTrackResponse> renameTrack(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long trackId,
            @Valid @RequestBody CsAdminTrackCreateRequest request) {
        return ApiResponse.success(csAdminContentService.renameTrack(userId, trackId, request));
    }

    @DeleteMapping("/tracks/{trackId}")
    public ApiResponse<Void> deleteTrack(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long trackId) {
        csAdminContentService.deleteTrack(userId, trackId);
        return ApiResponse.success();
    }

    @GetMapping("/stages/{stageId}/questions")
    public ApiResponse<List<CsAdminQuestionResponse>> getStageQuestions(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId) {
        return ApiResponse.success(csAdminContentService.getStageQuestions(userId, stageId));
    }

    @DeleteMapping("/stages/{stageId}")
    public ApiResponse<Void> deleteStage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId) {
        csAdminContentService.deleteStage(userId, stageId);
        return ApiResponse.success();
    }

    @PostMapping("/stages/{stageId}/questions/import")
    public ApiResponse<CsAdminQuestionImportResponse> importStageQuestions(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId,
            @Valid @RequestBody CsAdminStageQuestionImportRequest request) {
        return ApiResponse.success(csAdminContentService.importStageQuestions(userId, stageId, request));
    }

    @PutMapping("/stages/{stageId}/questions/{questionId}")
    public ApiResponse<CsAdminQuestionResponse> updateStageQuestion(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId,
            @PathVariable Long questionId,
            @Valid @RequestBody CsAdminQuestionUpdateRequest request) {
        return ApiResponse.success(csAdminContentService.updateStageQuestion(userId, stageId, questionId, request));
    }

    @PutMapping("/questions/{questionId}/short-answers")
    public ApiResponse<CsAdminQuestionResponse> updateQuestionShortAnswers(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long questionId,
            @Valid @RequestBody CsAdminQuestionShortAnswersUpdateRequest request) {
        return ApiResponse.success(csAdminContentService.updateShortAnswers(userId, questionId, request));
    }

    @GetMapping("/stages/{stageId}/claims")
    public ApiResponse<CsAdminClaimsPlaceholderResponse> getStageClaims(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long stageId) {
        return ApiResponse.success(csAdminContentService.getStageClaims(userId, stageId));
    }
}
