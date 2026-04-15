package com.peekle.domain.cs.entity;

import com.peekle.domain.cs.enums.CsQuestionContentMode;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;
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
@Table(name = "cs_questions")
public class CsQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private CsStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private CsQuestionType questionType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String prompt;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_mode", nullable = false, length = 20)
    @Builder.Default
    private CsQuestionContentMode contentMode = CsQuestionContentMode.LEGACY_TEXT;

    @Column(name = "content_blocks", columnDefinition = "TEXT")
    private String contentBlocks;

    @Enumerated(EnumType.STRING)
    @Column(name = "grading_mode", nullable = false, length = 30)
    @Builder.Default
    private CsQuestionGradingMode gradingMode = CsQuestionGradingMode.DEFAULT_BY_TYPE;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public void updateContent(
            CsQuestionType questionType,
            String prompt,
            String explanation,
            CsQuestionContentMode contentMode,
            String contentBlocks,
            CsQuestionGradingMode gradingMode,
            String metadata) {
        this.questionType = questionType;
        this.prompt = prompt;
        this.explanation = explanation;
        this.contentMode = contentMode;
        this.contentBlocks = contentBlocks;
        this.gradingMode = gradingMode;
        this.metadata = metadata;
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }
}
