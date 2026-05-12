package com.peekle.domain.leetcode.controller;

import com.peekle.domain.leetcode.dto.request.LeetcodeTranslationRequest;
import com.peekle.domain.leetcode.dto.response.LeetcodeTranslationResponse;
import com.peekle.domain.leetcode.service.LeetcodeSubmissionService;
import com.peekle.domain.leetcode.service.LeetcodeTranslationQuotaService;
import com.peekle.domain.leetcode.service.LeetcodeTranslationService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leetcode")
@RequiredArgsConstructor
@Slf4j
public class LeetcodeTranslationController {

    private final LeetcodeTranslationService leetcodeTranslationService;
    private final LeetcodeTranslationQuotaService leetcodeTranslationQuotaService;
    private final LeetcodeSubmissionService leetcodeSubmissionService;

    @PostMapping("/translate")
    public ApiResponse<LeetcodeTranslationResponse> translate(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody LeetcodeTranslationRequest request
    ) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        log.info("LeetCode 번역 요청 - userId: {}, count: {}", userId, request.texts().size());
        leetcodeTranslationService.validateRequest(request.texts());
        leetcodeTranslationQuotaService.consume(userId);
        LeetcodeTranslationResponse response = new LeetcodeTranslationResponse(leetcodeTranslationService.translate(request.texts()));
        try {
            leetcodeSubmissionService.upsertProblemMetadata(request.problem());
        } catch (RuntimeException error) {
            log.warn("LeetCode 문제 메타데이터 저장 실패 - userId: {}, problem: {}", userId, request.problem(), error);
        }
        return ApiResponse.success(response);
    }
}
