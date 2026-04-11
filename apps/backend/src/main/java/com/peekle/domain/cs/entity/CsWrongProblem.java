package com.peekle.domain.cs.entity;

import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(CsWrongProblemId.class)
@Table(name = "cs_wrong_problems")
public class CsWrongProblem {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private CsQuestion question;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CsWrongProblemStatus status = CsWrongProblemStatus.ACTIVE;

    @Builder.Default
    @Column(name = "review_correct_count", nullable = false)
    private Integer reviewCorrectCount = 0;

    @Builder.Default
    @Column(name = "wrong_count", nullable = false)
    private Integer wrongCount = 1;

    @Column(name = "last_wrong_at", nullable = false)
    private LocalDateTime lastWrongAt;

    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.lastWrongAt == null) {
            this.lastWrongAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void markWrong() {
        LocalDateTime now = LocalDateTime.now();
        this.status = CsWrongProblemStatus.ACTIVE;
        this.reviewCorrectCount = 0;
        this.wrongCount = (this.wrongCount == null ? 0 : this.wrongCount) + 1;
        this.lastWrongAt = now;
        this.clearedAt = null;
        this.updatedAt = now;
    }

    public void markCorrectReview(int clearThreshold) {
        LocalDateTime now = LocalDateTime.now();
        if (this.status == CsWrongProblemStatus.CLEARED) {
            this.updatedAt = now;
            return;
        }

        int current = this.reviewCorrectCount == null ? 0 : this.reviewCorrectCount;
        this.reviewCorrectCount = current + 1;

        if (this.reviewCorrectCount >= clearThreshold) {
            this.status = CsWrongProblemStatus.CLEARED;
            this.clearedAt = now;
        }
        this.updatedAt = now;
    }
}
