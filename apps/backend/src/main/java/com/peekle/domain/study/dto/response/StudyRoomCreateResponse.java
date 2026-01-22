package com.peekle.domain.study.dto.response;

import lombok.Getter;

@Getter
public class StudyRoomCreateResponse {
    private final String inviteCode;

    private StudyRoomCreateResponse(String inviteCode) {
        this.inviteCode = inviteCode;
    }

    public static StudyRoomCreateResponse of(String inviteCode) {
        return new StudyRoomCreateResponse(inviteCode);
    }
}
