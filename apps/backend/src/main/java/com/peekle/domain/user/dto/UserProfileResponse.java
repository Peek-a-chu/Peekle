package com.peekle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponse {
    private String nickname;
    private String leagueName;
    private Long score;
    private Integer rank;
    private String profileImage;
}