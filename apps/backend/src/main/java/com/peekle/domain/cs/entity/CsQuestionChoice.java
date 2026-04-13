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
        name = "cs_question_choices",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cs_question_choices_question_choice_no",
                        columnNames = { "question_id", "choice_no" })
        })
public class CsQuestionChoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private CsQuestion question;

    @Column(name = "choice_no", nullable = false)
    private Short choiceNo;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Builder.Default
    @Column(name = "is_answer", nullable = false)
    private Boolean isAnswer = false;

    public void update(String content, Boolean isAnswer) {
        this.content = content;
        this.isAnswer = isAnswer;
    }
}
