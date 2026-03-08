package com.peekle.domain.submission.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmissionCommentUpdateRequest {
    private String content;
}
