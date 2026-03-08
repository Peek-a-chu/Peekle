package com.peekle.domain.submission.dto;

import com.peekle.domain.submission.entity.SubmissionComment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SubmissionCommentResponse {
    private Long id;
    private Long submissionId;
    private Long parentId;
    private Long authorId;
    private String authorNickname;
    private String authorProfileImage;
    private String type;
    private Boolean isDeleted;
    private Integer lineStart;
    private Integer lineEnd;
    private String content;
    private LocalDateTime createdAt;

    public static SubmissionCommentResponse from(SubmissionComment comment) {
        return SubmissionCommentResponse.builder()
                .id(comment.getId())
                .submissionId(comment.getSubmission().getId())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .authorId(comment.getUser().getId())
                .authorNickname(comment.getUser().getNickname())
                .authorProfileImage(comment.getUser().getProfileImgThumb())
                .type(comment.getCommentType().name())
                .isDeleted(Boolean.TRUE.equals(comment.getIsDeleted()))
                .lineStart(comment.getLineStart())
                .lineEnd(comment.getLineEnd())
                .content(Boolean.TRUE.equals(comment.getIsDeleted()) ? "삭제된 댓글입니다." : comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
