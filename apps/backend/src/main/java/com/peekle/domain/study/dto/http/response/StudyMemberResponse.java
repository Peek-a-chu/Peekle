package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyMember;
import lombok.Builder;
import lombok.Getter;

import static com.peekle.domain.study.entity.StudyMember.StudyRole;

@Getter
@Builder
public class StudyMemberResponse {
    private Long userId;
    private String nickname;
    private String profileImg;
    private StudyRole role;
    private boolean isOnline;

    public static StudyMemberResponse of(StudyMember member, boolean isOnline) {
        String profileImg = member.getUser().getProfileImgThumb();
        if (profileImg == null) {
            profileImg = member.getUser().getProfileImg();
        }

        return StudyMemberResponse.builder()
                .userId(member.getUser().getId())
                .nickname(member.getUser().getNickname())
                .profileImg(profileImg)
                .role(member.getRole())
                .isOnline(isOnline)
                .build();
    }
}
