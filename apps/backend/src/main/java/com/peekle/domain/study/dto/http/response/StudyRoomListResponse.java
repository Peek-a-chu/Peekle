package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.user.entity.User;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class StudyRoomListResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final boolean isActive;
    private final LocalDateTime createdAt;
    private final int memberCount;
    private final List<String> profileImages;
    private final int rankingPoint;
    private final OwnerInfo owner; // nullable

    @Getter
    public static class OwnerInfo {
        private final Long id;
        private final String nickname;
        private final String profileImage;

        private OwnerInfo(User user) {
            this.id = user.getId();
            this.nickname = user.getNickname();
            String img = user.getProfileImgThumb();
            if (img == null) {
                img = user.getProfileImg();
            }
            this.profileImage = img;
        }

        public static OwnerInfo from(User user) {
            return new OwnerInfo(user);
        }
    }

    private StudyRoomListResponse(StudyRoom studyRoom, int memberCount, List<String> profileImages) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
        this.memberCount = memberCount;
        this.profileImages = profileImages;
        this.rankingPoint = studyRoom.getRankingPoint();
        this.owner = OwnerInfo.from(studyRoom.getOwner());
    }

    public static StudyRoomListResponse of(StudyRoom studyRoom, int memberCount, List<String> profileImages) {
        return new StudyRoomListResponse(studyRoom, memberCount, profileImages);
    }
}
