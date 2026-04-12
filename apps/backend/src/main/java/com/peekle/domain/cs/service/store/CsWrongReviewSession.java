package com.peekle.domain.cs.service.store;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsWrongReviewSession {
    private String reviewId;
    private Long userId;
    private Integer domainId;
    private Long stageId;
    private List<Long> questionOrder;
    private Integer currentIndex;
    private Integer correctCount;
    private Integer clearedCount;
    private Map<Long, Boolean> latestCorrectByQuestionId;
    private Boolean completed;
    private LocalDateTime startedAt;
    private LocalDateTime updatedAt;
}
