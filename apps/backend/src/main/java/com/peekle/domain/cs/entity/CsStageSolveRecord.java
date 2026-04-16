package com.peekle.domain.cs.entity;

import com.peekle.domain.user.entity.User;
import jakarta.persistence.*;
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
@Table(
        name = "cs_stage_solve_records",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cs_stage_solve_records_user_stage",
                        columnNames = { "user_id", "stage_id" })
        })
public class CsStageSolveRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private CsStage stage;

    @Column(name = "max_solve", nullable = false)
    private Integer maxSolve;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
        if (this.maxSolve == null) {
            this.maxSolve = 0;
        }
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateMaxSolve(int candidate) {
        int safeCandidate = Math.max(0, candidate);
        if (this.maxSolve == null || this.maxSolve < safeCandidate) {
            this.maxSolve = safeCandidate;
        }
    }
}
