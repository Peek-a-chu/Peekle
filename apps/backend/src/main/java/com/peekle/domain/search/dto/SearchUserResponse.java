package com.peekle.domain.search.dto;

import com.peekle.domain.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchUserResponse {
    private Long userId;
    private String nickname;
    private String profileImg;
    private String tier;
    public static SearchUserResponse from(User user) {
        return SearchUserResponse.builder()
                .userId(user.getId())
                .nickname(user.getNickname())
                .profileImg(user.getProfileImg())
                .tier(user.getLeague().name())
                .build();
    }
}
