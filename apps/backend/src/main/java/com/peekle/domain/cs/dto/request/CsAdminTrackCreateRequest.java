package com.peekle.domain.cs.dto.request;

import com.peekle.domain.cs.enums.CsTrackLearningMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CsAdminTrackCreateRequest(
        @NotBlank(message = "name은 필수입니다.")
        @Size(max = 150, message = "name은 150자 이하여야 합니다.")
        String name,
        @Positive(message = "stageCount는 1 이상의 값이어야 합니다.")
        Integer stageCount,
        CsTrackLearningMode learningMode,
        Integer examYear) {
}
