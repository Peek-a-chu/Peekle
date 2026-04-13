package com.peekle.domain.cs.dto.response;

public record CsAdminQuestionImportResponse(
        Long stageId,
        String mode,
        int createdCount,
        int updatedCount,
        int deactivatedCount,
        int totalActiveQuestions) {
}
