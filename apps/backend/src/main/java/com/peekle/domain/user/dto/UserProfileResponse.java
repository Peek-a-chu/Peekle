package com.peekle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponse {
    private Long id;
    private String nickname;
    private String bojId;
    private String leagueName;
    private Long score;
    private Integer rank;
    private String profileImage;
    private Integer streakCurrent;
    private Integer streakMax;
    private Long solvedCount;
}
