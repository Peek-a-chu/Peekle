package com.peekle.domain.study.entity;

import com.peekle.domain.study.enums.ProblemType;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "study_problems")
public class StudyProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "problem_type", nullable = false)
    @Builder.Default
    private ProblemType type = ProblemType.BOJ;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_room_id", nullable = false)
    private StudyRoom study;

    @Column(name = "problem_id")
    private Long problemId;

    @Column(name = "custom_title")
    private String customTitle;

    @Column(name = "custom_link")
    private String customLink;

    @Column(name = "problem_date", nullable = false)
    private LocalDate problemDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
