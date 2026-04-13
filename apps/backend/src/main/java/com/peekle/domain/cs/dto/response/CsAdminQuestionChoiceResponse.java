package com.peekle.domain.cs.dto.response;

public record CsAdminQuestionChoiceResponse(
        Integer choiceNo,
        String content,
        Boolean isAnswer) {
}
