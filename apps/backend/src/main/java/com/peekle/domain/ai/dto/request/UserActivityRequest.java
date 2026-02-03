package com.peekle.domain.ai.dto.request;

import java.util.List;

public record UserActivityRequest(
        List<String> solvedProblemTitles, // 최근 성공 문제 (학습 흐름)
        List<String> failedProblemTitles, // 최근 실패 문제 (보완 필요)
        List<TagStatDto> tagStats,         // 태그별 정답률 (강점/약점 분석)
        String currentTier                 // 실력대 필터링
) {}

