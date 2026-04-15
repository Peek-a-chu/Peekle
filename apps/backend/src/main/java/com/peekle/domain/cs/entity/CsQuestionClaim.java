package com.peekle.domain.cs.entity;

import com.peekle.domain.cs.enums.CsQuestionClaimStatus;
import com.peekle.domain.cs.enums.CsQuestionClaimType;
import com.peekle.domain.user.entity.User;
import com.peekle.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "cs_question_claims")
public class CsQuestionClaim extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private CsStage stage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private CsQuestion question;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_type", nullable = false, length = 40)
    private CsQuestionClaimType claimType;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;

    @Column(name = "selected_choice_no")
    private Short selectedChoiceNo;

    @Column(name = "submitted_answer", columnDefinition = "TEXT")
    private String submittedAnswer;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CsQuestionClaimStatus status = CsQuestionClaimStatus.RECEIVED;

    public void updateStatus(CsQuestionClaimStatus status) {
        this.status = status;
    }
}
