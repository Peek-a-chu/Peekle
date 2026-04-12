package com.peekle.domain.cs.service.store;

import com.peekle.domain.cs.enums.CsAttemptPhase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsAttemptSession {
    private Long userId;
    private Long stageId;
    private Integer domainId;
    private CsAttemptPhase phase;
    private Integer retryRound;
    private List<Long> questionOrder;
    private List<Long> currentRoundQuestionIds;
    private Integer currentRoundIndex;
    private Integer firstPassCorrectCount;
    private Set<Long> firstPassWrongQuestionIds;
    private Map<Long, Integer> wrongAttemptCountByQuestionId;
    private Map<Long, Boolean> latestCorrectByQuestionId;
    private LocalDateTime startedAt;
    private LocalDateTime updatedAt;
}
