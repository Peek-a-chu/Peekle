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
    private String profileImg;
    private Integer streakCurrent;
    private Integer streakMax;
    private Long solvedCount;
    private boolean me;
    //TODO: 활동 스트릭 넣기

    //TODO: 오늘의 학습 타임라인넣기
}
