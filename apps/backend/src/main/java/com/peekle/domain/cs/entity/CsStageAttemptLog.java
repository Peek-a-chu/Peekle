package com.peekle.domain.cs.entity;

import com.peekle.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
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
@Table(name = "cs_stage_attempt_logs")
public class CsStageAttemptLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id", nullable = false)
    private CsDomain domain;

    @Column(name = "track_no", nullable = false)
    private Short trackNo;

    @Column(name = "stage_no", nullable = false)
    private Short stageNo;

    @Column(name = "correct_count", nullable = false)
    private Integer correctCount;

    @Column(name = "total_count", nullable = false)
    private Integer totalCount;

    @Column(name = "is_review", nullable = false)
    @Builder.Default
    private Boolean isReview = false;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
