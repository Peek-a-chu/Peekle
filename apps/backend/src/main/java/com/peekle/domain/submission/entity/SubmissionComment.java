package com.peekle.domain.submission.entity;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.submission.enums.SubmissionCommentType;
import com.peekle.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "submission_comments")
public class SubmissionComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private SubmissionLog submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private SubmissionComment parent;

    @Enumerated(EnumType.STRING)
    @Column(name = "comment_type", nullable = false, length = 20)
    private SubmissionCommentType commentType;

    @Column(name = "line_start", nullable = false)
    private Integer lineStart;

    @Column(name = "line_end", nullable = false)
    private Integer lineEnd;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Builder
    private SubmissionComment(
            SubmissionLog submission,
            User user,
            SubmissionComment parent,
            SubmissionCommentType commentType,
            Integer lineStart,
            Integer lineEnd,
            String content) {
        this.submission = submission;
        this.user = user;
        this.parent = parent;
        this.commentType = commentType;
        this.lineStart = lineStart;
        this.lineEnd = lineEnd;
        this.content = content;
        this.isDeleted = false;
    }

    public void markDeleted() {
        this.isDeleted = true;
        this.content = "";
    }

    public void updateContent(String content) {
        this.content = content;
    }
}
