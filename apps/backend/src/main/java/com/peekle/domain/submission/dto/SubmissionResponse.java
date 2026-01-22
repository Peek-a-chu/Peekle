package com.peekle.domain.submission.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubmissionResponse {
    private Long submissionId;
    private boolean success;      // 검증/저장 성공 여부
    private boolean firstSolve; // 처음 풀었는지 여부
    private int earnedPoints;     // 획득한 포인트
    private int totalPoints;      // 현재 내 총 포인트
    private String currentLeague;
    private int currentRank;      // 현재 내 그룹 내 등수
    private String message;       // 표시할 메시지
}
