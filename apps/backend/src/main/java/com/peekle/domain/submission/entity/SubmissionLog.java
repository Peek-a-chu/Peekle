package com.peekle.domain.submission.entity;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter; // Setter for easy updates from service
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "submission_log")
public class SubmissionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(name = "source_type")
    private String sourceType; // STUDY | GAME | EXTENSION

    @Column(name = "room_id")
    private Long roomId; // Nullable

    @Column(name = "problem_title")
    private String problemTitle;

    @Column(name = "problem_tier")
    private String problemTier;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String code;

    private String result; // SUCCESS | FAIL

    private Integer memory;

    @Column(name = "execution_time")
    private Integer executionTime;

    private String language;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // 편의 생성자
    public static SubmissionLog create(User user, Problem problem, String sourceType, 
                                     String code, String result, Integer memory, 
                                     Integer executionTime, String language, LocalDateTime submittedAt) {
        SubmissionLog log = new SubmissionLog();
        log.user = user;
        log.problem = problem;
        log.sourceType = sourceType;
        log.problemTitle = problem.getTitle();
        log.problemTier = problem.getTier();
        log.code = code;
        log.result = result;
        log.memory = memory;
        log.executionTime = executionTime;
        log.language = language;
        log.submittedAt = submittedAt;
        return log;
    }
}
