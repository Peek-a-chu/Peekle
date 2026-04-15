package com.peekle.domain.cs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        name = "cs_question_short_answers",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cs_question_short_answers_question_blank_normalized",
                        columnNames = { "question_id", "blank_index", "normalized_answer" })
        })
public class CsQuestionShortAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private CsQuestion question;

    @Column(name = "answer_text", nullable = false, length = 200)
    private String answerText;

    @Column(name = "normalized_answer", nullable = false, length = 200)
    private String normalizedAnswer;

    @Builder.Default
    @Column(name = "blank_index", nullable = false)
    private Short blankIndex = 1;

    @Builder.Default
    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    public void update(String answerText, String normalizedAnswer, Short blankIndex, Boolean isPrimary) {
        this.answerText = answerText;
        this.normalizedAnswer = normalizedAnswer;
        this.blankIndex = blankIndex;
        this.isPrimary = isPrimary;
    }
}
