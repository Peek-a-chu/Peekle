package com.peekle.domain.cs.dto.response;

public record CsAttemptCompleteResponse(
        Long stageId,
        Boolean isTrackCompleted,
        Integer correctRate,
        Integer correctCount,
        Integer wrongCount,
        String messageCode,
        Boolean streakEarnedToday,
        Integer currentStreak,
        Integer earnedScore,
        Integer totalScore,
        Long nextStageId,
        Integer maxSolve) {
}
