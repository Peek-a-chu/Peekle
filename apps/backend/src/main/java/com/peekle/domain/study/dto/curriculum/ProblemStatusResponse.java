package com.peekle.domain.study.dto.curriculum;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@ToString
public class ProblemStatusResponse {

    private Long problemId;

    private String title;

    private String tier;

    private LocalDate assignedDate;

    private int solvedMemberCount;

    private int totalMemberCount;

    private boolean isSolvedByMe;

    // Optional: List of solved members (nicknames)
    // private List<String> solvedMembers;

    @Builder
    public ProblemStatusResponse(Long problemId, String title, String tier, LocalDate assignedDate,
            int solvedMemberCount, int totalMemberCount, boolean isSolvedByMe) {
        this.problemId = problemId;
        this.title = title;
        this.tier = tier;
        this.assignedDate = assignedDate;
        this.solvedMemberCount = solvedMemberCount;
        this.totalMemberCount = totalMemberCount;
        this.isSolvedByMe = isSolvedByMe;
    }
}
