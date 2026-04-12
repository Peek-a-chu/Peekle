package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsQuestionType;

public record CsWrongReviewAnswerResponse(
        String reviewId,
        Long questionId,
        CsQuestionType questionType,
        CsAttemptProgressResponse progress,
        Boolean isCorrect,
        String feedback,
        Integer correctChoiceNo,
        String correctAnswer,
        Boolean isLast,
        CsQuestionPayloadResponse nextQuestion) {
}
