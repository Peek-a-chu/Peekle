package com.peekle.domain.submission.entity;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.submission.enums.SourceType;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "submission_logs")
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
    @Enumerated(EnumType.STRING)
    private SourceType sourceType;

    @Column(name = "problem_title")
    private String problemTitle;

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "external_id")
    private String externalId; // BOJ Problem ID (e.g. "1000")

    @Column(name = "problem_tier")
    private String problemTier;

    @Column(columnDefinition = "TEXT")
    private String code;


    private Integer memory;

    @Column(name = "execution_time")
    private Integer executionTime;

    @Column(name = "tag")
    private String tag; // e.g. "[팀] 스피드 레이스", "알고리즘 스터디"

    private String language;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    public static SubmissionLog create(User user, Problem problem, SourceType sourceType, 
                                     String problemTitle, String problemTier, String externalId,
                                     String tag,
                                     String code, Integer memory, 
                                     Integer executionTime, String language, LocalDateTime submittedAt) {
        SubmissionLog log = new SubmissionLog();
        log.user = user;
        log.problem = problem;
        log.sourceType = sourceType;
        log.problemTitle = problemTitle;
        log.externalId = externalId;
        log.problemTier = problemTier;
        log.tag = tag;
        log.code = code;
        log.memory = memory;
        log.executionTime = executionTime;
        log.language = language;
        log.submittedAt = submittedAt;
        return log;
    }
}
