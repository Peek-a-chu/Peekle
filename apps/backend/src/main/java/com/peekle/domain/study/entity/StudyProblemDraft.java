package com.peekle.domain.study.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "study_problem_drafts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_study_problem_draft_member_problem", columnNames = {
                        "study_member_id", "study_problem_id"
                })
        })
public class StudyProblemDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_member_id", nullable = false)
    private StudyMember studyMember;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_problem_id", nullable = false)
    private StudyProblem studyProblem;

    @Lob
    @Column(name = "code")
    private String code;

    @Column(name = "language", length = 50)
    private String language;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateDraft(String code, String language) {
        this.code = code;
        this.language = language;
        this.updatedAt = LocalDateTime.now();
    }
}
