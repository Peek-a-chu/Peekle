package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyRoom;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class StudyRoomResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final OwnerInfo owner; // TEMPORARY structure
    private final int rankingPoint;
    private final boolean isActive;
    private final LocalDateTime createdAt;

    // Old constructor removed
    // Old from method removed

    @Getter
    public static class OwnerInfo {
        private final Long id;
        private final String nickname;
        private final String profileImage;

        private OwnerInfo(com.peekle.domain.user.entity.User user) {
            this.id = user.getId();
            this.nickname = user.getNickname();
            this.profileImage = user.getProfileImgThumb();
        }

        public static OwnerInfo from(com.peekle.domain.user.entity.User user) {
            return new OwnerInfo(user);
        }
    }

    private final java.util.List<StudyMemberResponse> members;

    private StudyRoomResponse(StudyRoom studyRoom, java.util.List<StudyMemberResponse> members) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.owner = OwnerInfo.from(studyRoom.getOwner());
        this.rankingPoint = studyRoom.getRankingPoint();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
        this.members = members != null ? members : java.util.Collections.emptyList();
    }

    public static StudyRoomResponse from(StudyRoom studyRoom, java.util.List<StudyMemberResponse> members) {
        return new StudyRoomResponse(studyRoom, members);
    }

    public static StudyRoomResponse from(StudyRoom studyRoom) {
        return new StudyRoomResponse(studyRoom, java.util.Collections.emptyList());
    }
}
