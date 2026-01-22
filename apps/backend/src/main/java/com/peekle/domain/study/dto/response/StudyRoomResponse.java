package com.peekle.domain.study.dto.response;

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

    private StudyRoomResponse(StudyRoom studyRoom) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.owner = OwnerInfo.from(studyRoom.getOwnerId());
        this.rankingPoint = studyRoom.getRankingPoint();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
    }

    public static StudyRoomResponse from(StudyRoom studyRoom) {
        return new StudyRoomResponse(studyRoom);
    }

    @Getter
    public static class OwnerInfo {
        private final Long id;
        private final String nickname;

        private OwnerInfo(Long id, String nickname) {
            this.id = id;
            this.nickname = nickname;
        }

        public static OwnerInfo from(Long ownerId) {
            // User Table이 없으므로 닉네임을 알 수 없음. 임시값 사용.
            return new OwnerInfo(ownerId, "Unknown User " + ownerId);
        }
    }
}
