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

    @com.fasterxml.jackson.annotation.JsonProperty("problemId")
    private Long problemId;

    @com.fasterxml.jackson.annotation.JsonProperty("title")
    private String title;

    @com.fasterxml.jackson.annotation.JsonProperty("tier")
    private String tier;

    @com.fasterxml.jackson.annotation.JsonProperty("assignedDate")
    private LocalDate assignedDate;

    @com.fasterxml.jackson.annotation.JsonProperty("solvedMemberCount")
    private int solvedMemberCount;

    @com.fasterxml.jackson.annotation.JsonProperty("totalMemberCount")
    private int totalMemberCount;

    @com.fasterxml.jackson.annotation.JsonProperty("isSolvedByMe")
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
