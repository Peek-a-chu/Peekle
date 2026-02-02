package com.peekle.domain.submission.dto;

import com.peekle.domain.submission.entity.SubmissionLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SubmissionLogResponse {
    private Long submissionId;
    private Long userId;
    private String nickname;
    private String profileImage;
    private Integer memory;
    private Integer executionTime;
    private String language;
    private LocalDateTime submittedAt;
    
    // Added fields for detailed history
    private String problemId; // BOJ ID (externalId)
    private String problemTitle;
    private String tier;
    private String sourceType;
    private String sourceDetail;
    private String code;
    private Boolean isSuccess;

    // 코드 확인을 위한 상세 내용은 별도 조회하거나,
    // 리스트에서 바로 보여주고 싶다면 여기에 code 필드를 추가할 수도 있음.
    // 여기서는 목록 조회용이므로 코드는 제외하거나 짧게 포함.
    // UI 요청 사항: "코드 확인하기" 버튼 -> 상세 조회. 따라서 여기서는 제외.

    public static SubmissionLogResponse from(SubmissionLog log) {
        return SubmissionLogResponse.builder()
                .submissionId(log.getId())
                .userId(log.getUser().getId())
                .nickname(log.getUser().getNickname())
                .profileImage(log.getUser().getProfileImgThumb())
                .memory(log.getMemory())
                .executionTime(log.getExecutionTime())
                .language(log.getLanguage())
                .submittedAt(log.getSubmittedAt())
                // Mapping new fields
                .problemId(log.getExternalId())
                .problemTitle(log.getProblemTitle())
                .tier(log.getProblemTier())
                .sourceType(log.getSourceType() != null ? log.getSourceType().name() : "SOLO")
                .sourceDetail(log.getTag())
                .code(log.getCode())
                .isSuccess(true) // Assuming all logs are successful for now 
                .build();
    }
}
