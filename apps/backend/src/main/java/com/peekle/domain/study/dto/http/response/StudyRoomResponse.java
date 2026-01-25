package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.user.entity.User;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
public class StudyRoomResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final OwnerInfo owner; // TEMPORARY structure
    private final int rankingPoint;
    private final boolean isActive;
    private final LocalDateTime createdAt;
    private final List<StudyMemberResponse> members;

    // Old constructor removed
    // Old from method removed

    @Getter
    public static class OwnerInfo {
        private final Long id;
        private final String nickname;
        private final String profileImage;

        private OwnerInfo(User user) {
            this.id = user.getId();
            this.nickname = user.getNickname();
            this.profileImage = user.getProfileImgThumb();
        }

        public static OwnerInfo from(User user) {
            return new OwnerInfo(user);
        }
    }

    private StudyRoomResponse(StudyRoom studyRoom, List<StudyMemberResponse> members) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.owner = OwnerInfo.from(studyRoom.getOwner());
        this.rankingPoint = studyRoom.getRankingPoint();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
        this.members = members != null ? members : Collections.emptyList();
    }

    public static StudyRoomResponse from(StudyRoom studyRoom, List<StudyMemberResponse> members) {
        return new StudyRoomResponse(studyRoom, members);
    }

    public static StudyRoomResponse from(StudyRoom studyRoom) {
        return new StudyRoomResponse(studyRoom, Collections.emptyList());
    }
}
