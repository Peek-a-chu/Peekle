package com.peekle.domain.submission.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SubmissionCommentCreateRequest {
    private Long parentId;
    private String type;
    private Integer lineStart;
    private Integer lineEnd;
    private String content;
}
