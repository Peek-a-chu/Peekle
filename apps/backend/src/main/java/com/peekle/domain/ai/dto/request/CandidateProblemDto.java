package com.peekle.domain.ai.dto.request;

import java.util.List;

public record CandidateProblemDto(
        String problemId,
        String title,
        String tier,
        Integer level,
        List<String> tags,
        Integer difficultyGap,
        Integer weakTagMatchCount,
        Integer strongTagMatchCount,
        Integer staleTagMatchCount,
        Boolean recentlyRecommended,
        Double candidateScore,
        String selectionIntentHint,
        Double popularityScore,
        Double noveltyScore
) {
}
