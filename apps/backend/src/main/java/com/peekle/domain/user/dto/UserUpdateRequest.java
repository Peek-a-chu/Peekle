package com.peekle.domain.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserUpdateRequest {
    private String nickname;
    private String bojId;
    private String profileImg;
    private String profileImgThumb;
    private Boolean isProfileImageDeleted;
}
