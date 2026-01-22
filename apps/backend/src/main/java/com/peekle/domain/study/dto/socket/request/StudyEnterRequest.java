package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 스터디 입장 요청
@Getter
@NoArgsConstructor
public class StudyEnterRequest {
    // 기존 멤버는 studyId로 입장
    private Long studyId;

    // 신규 유저는 inviteCode로 입장
    private String inviteCode;
}
