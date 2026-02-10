package com.peekle.domain.study.dto.curriculum;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
@ToString
public class ProblemStatusResponse {

    private Long studyProblemId; // StudyProblem 엔티티의 PK

    private Long problemId;

    private String externalId; // BOJ problem number (e.g. "1000")

    private String title;

    private String customTitle;

    private String customLink;

    private String tier;

    private LocalDate assignedDate;

    private int solvedMemberCount;

    private int totalMemberCount;

    private boolean isSolvedByMe;

    private List<String> tags;

    // Optional: List of solved members (nicknames)
    // private List<String> solvedMembers;

    @Builder
    public ProblemStatusResponse(Long studyProblemId, Long problemId, String externalId, String title,
            String customTitle, String customLink, String tier,
            LocalDate assignedDate,
            int solvedMemberCount, int totalMemberCount, boolean isSolvedByMe, List<String> tags) {
        this.studyProblemId = studyProblemId;
        this.problemId = problemId;
        this.externalId = externalId;
        this.title = title;
        this.customTitle = customTitle;
        this.customLink = customLink;
        this.tier = tier;
        this.assignedDate = assignedDate;
        this.solvedMemberCount = solvedMemberCount;
        this.totalMemberCount = totalMemberCount;
        this.isSolvedByMe = isSolvedByMe;
        this.tags = tags;
    }
}
