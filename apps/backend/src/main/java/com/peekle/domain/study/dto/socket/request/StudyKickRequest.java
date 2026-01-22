package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 참여자 강퇴 요청
@Getter
@NoArgsConstructor
public class StudyKickRequest {
    private Long studyId;
    private Long targetUserId;
}