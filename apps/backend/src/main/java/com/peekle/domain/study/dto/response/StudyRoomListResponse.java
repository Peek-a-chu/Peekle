package com.peekle.domain.study.dto.response;

import com.peekle.domain.study.entity.StudyRoom;
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

    private StudyRoomListResponse(StudyRoom studyRoom, int memberCount, List<String> profileImages) {
        this.id = studyRoom.getId();
        this.title = studyRoom.getTitle();
        this.description = studyRoom.getDescription();
        this.isActive = studyRoom.isActive();
        this.createdAt = studyRoom.getCreatedAt();
        this.memberCount = memberCount;
        this.profileImages = profileImages;
    }

    public static StudyRoomListResponse of(StudyRoom studyRoom, int memberCount, List<String> profileImages) {
        return new StudyRoomListResponse(studyRoom, memberCount, profileImages);
    }
}
