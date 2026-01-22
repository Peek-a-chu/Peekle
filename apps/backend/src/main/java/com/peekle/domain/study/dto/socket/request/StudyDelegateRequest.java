package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 방장 위임 요청
@Getter
@NoArgsConstructor
class StudyDelegateRequest {
    private Long studyId;
    private Long newLeaderId;
}