CREATE TABLE submission_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT NULL,
    line_start INT NOT NULL,
    line_end INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    comment_type VARCHAR(20) NOT NULL DEFAULT 'INLINE';
    CONSTRAINT fk_submission_comments_submission
        FOREIGN KEY (submission_id) REFERENCES submission_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_submission_comments_parent
        FOREIGN KEY (parent_id) REFERENCES submission_comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_comments_submission_created
    ON submission_comments(submission_id, created_at);

CREATE INDEX idx_submission_comments_parent
    ON submission_comments(parent_id);

CREATE INDEX idx_submission_comments_type
    ON submission_comments(comment_type);

CREATE INDEX idx_submission_comments_deleted
    ON submission_comments(is_deleted);
