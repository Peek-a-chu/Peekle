package com.peekle.domain.study.dto.http.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class StudyRoomJoinRequest {
    private String inviteCode;
}
