package com.peekle.domain.leetcode.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record LeetcodeTranslationRequest(
        @NotEmpty(message = "번역할 텍스트가 필요합니다.")
        @Size(max = 20, message = "한 번에 최대 20개까지 번역할 수 있습니다.")
        List<@NotBlank(message = "번역할 텍스트는 비어 있을 수 없습니다.")
                @Size(max = 2000, message = "텍스트는 2000자를 넘을 수 없습니다.") String> texts
) {
}
