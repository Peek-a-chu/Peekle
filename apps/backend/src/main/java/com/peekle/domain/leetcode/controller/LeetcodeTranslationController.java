package com.peekle.domain.leetcode.controller;

import com.peekle.domain.leetcode.dto.request.LeetcodeTranslationRequest;
import com.peekle.domain.leetcode.dto.response.LeetcodeTranslationResponse;
import com.peekle.domain.leetcode.service.GeminiTranslationService;
import com.peekle.domain.leetcode.service.LeetcodeTranslationQuotaService;
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

    private final GeminiTranslationService geminiTranslationService;
    private final LeetcodeTranslationQuotaService leetcodeTranslationQuotaService;

    @PostMapping("/translate")
    public ApiResponse<LeetcodeTranslationResponse> translate(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody LeetcodeTranslationRequest request
    ) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        log.info("LeetCode 번역 요청 - userId: {}, count: {}", userId, request.texts().size());
        geminiTranslationService.validateRequest(request.texts());
        leetcodeTranslationQuotaService.consume(userId);
        return ApiResponse.success(new LeetcodeTranslationResponse(geminiTranslationService.translate(request.texts())));
    }
}
