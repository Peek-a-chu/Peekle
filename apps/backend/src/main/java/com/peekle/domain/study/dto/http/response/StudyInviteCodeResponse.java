package com.peekle.domain.study.dto.http.response;

import lombok.Getter;

@Getter
public class StudyInviteCodeResponse {
    private final String inviteCode;

    private StudyInviteCodeResponse(String inviteCode) {
        this.inviteCode = inviteCode;
    }

    public static StudyInviteCodeResponse of(String inviteCode) {
        return new StudyInviteCodeResponse(inviteCode);
    }
}
