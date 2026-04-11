package com.peekle.domain.cs.dto.response;

import com.peekle.domain.cs.enums.CsAttemptPhase;
import com.peekle.domain.cs.enums.CsQuestionType;

public record CsAttemptAnswerResponse(
        Long questionId,
        CsQuestionType questionType,
        CsAttemptProgressResponse progress,
        CsAttemptPhase phase,
        Boolean isCorrect,
        String feedback,
        Integer correctChoiceNo,
        String correctAnswer,
        Boolean isLast,
        CsQuestionPayloadResponse nextQuestion) {
}
