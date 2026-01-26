package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyMember;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StudyMemberResponse {
    private Long userId;
    private String nickname;
    private String profileImage;
    private StudyMember.StudyRole role;
    private boolean isOnline;

    public static StudyMemberResponse of(StudyMember member, boolean isOnline) {
        return StudyMemberResponse.builder()
                .userId(member.getUser().getId())
                .nickname(member.getUser().getNickname())
                .profileImage(member.getUser().getProfileImgThumb())
                .role(member.getRole())
                .isOnline(isOnline)
                .build();
    }
}
