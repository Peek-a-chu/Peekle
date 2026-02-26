package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 스터디 탈퇴 요청
@Getter
@NoArgsConstructor
public class StudyLeaveRequest {
    private Long studyId;
}