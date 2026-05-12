package com.peekle.domain.leetcode.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;

public record LeetcodeTranslationRequest(
        @NotEmpty(message = "번역할 텍스트가 필요합니다.")
        @Size(max = 20, message = "한 번에 최대 20개까지 번역할 수 있습니다.")
        List<@NotBlank(message = "번역할 텍스트는 비어 있을 수 없습니다.")
                @Size(max = 2000, message = "텍스트는 2000자를 넘을 수 없습니다.") String> texts,
        @Valid
        ProblemMetadata problem
) {
    public record ProblemMetadata(
            @Size(max = 50, message = "문제 번호는 50자를 넘을 수 없습니다.")
            String externalId,
            @Size(max = 50, message = "문제 번호는 50자를 넘을 수 없습니다.")
            String problemNumber,
            @Size(max = 255, message = "문제 slug는 255자를 넘을 수 없습니다.")
            String titleSlug,
            @Size(max = 255, message = "문제 제목은 255자를 넘을 수 없습니다.")
            String title,
            @Size(max = 255, message = "영문 제목은 255자를 넘을 수 없습니다.")
            String englishTitle,
            @Size(max = 255, message = "한글 제목은 255자를 넘을 수 없습니다.")
            String koreanTitle,
            @Size(max = 50, message = "난이도는 50자를 넘을 수 없습니다.")
            String difficulty,
            @Size(max = 1000, message = "문제 URL은 1000자를 넘을 수 없습니다.")
            String problemUrl,
            List<@Valid TagMetadata> tags
    ) {
        public ProblemMetadata {
            if (tags == null) {
                tags = new ArrayList<>();
            }
        }
    }

    public record TagMetadata(
            @Size(max = 255, message = "태그 키는 255자를 넘을 수 없습니다.")
            String key,
            @Size(max = 255, message = "태그 이름은 255자를 넘을 수 없습니다.")
            String name
    ) {
    }
}
