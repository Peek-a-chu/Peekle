package com.peekle.domain.study.dto.http.response;

import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.user.entity.User;
import lombok.Getter;

import java.time.LocalDate;
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
    private final Long lastStudyProblemId;
    private final LocalDate lastStudyProblemDate;
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

    private final String role; // "OWNER" or "MEMBER"

    private StudyRoomResponse(
            StudyRoom studyRoom,
            List<StudyMemberResponse> members,
            Long currentUserId,
            Long lastStudyProblemId,
            LocalDate lastStudyProblemDate) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.owner = OwnerInfo.from(studyRoom.getOwner());
        this.rankingPoint = studyRoom.getRankingPoint();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
        this.lastStudyProblemId = lastStudyProblemId;
        this.lastStudyProblemDate = lastStudyProblemDate;
        this.members = members != null ? members : Collections.emptyList();

        // 권한 결정 로직
        if (currentUserId != null && studyRoom.getOwner().getId().equals(currentUserId)) {
            this.role = "OWNER";
        } else {
            this.role = "MEMBER";
        }
    }

    public static StudyRoomResponse from(StudyRoom studyRoom, List<StudyMemberResponse> members, Long currentUserId) {
        return new StudyRoomResponse(studyRoom, members, currentUserId, null, null);
    }

    public static StudyRoomResponse from(
            StudyRoom studyRoom,
            List<StudyMemberResponse> members,
            Long currentUserId,
            Long lastStudyProblemId,
            LocalDate lastStudyProblemDate) {
        return new StudyRoomResponse(studyRoom, members, currentUserId, lastStudyProblemId, lastStudyProblemDate);
    }

    // For cases where members are not loaded yet or simplified view
    public static StudyRoomResponse from(StudyRoom studyRoom, Long currentUserId) {
        return new StudyRoomResponse(studyRoom, Collections.emptyList(), currentUserId, null, null);
    }
}
