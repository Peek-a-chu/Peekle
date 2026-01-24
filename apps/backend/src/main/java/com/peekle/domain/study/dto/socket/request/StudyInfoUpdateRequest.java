package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 스터디 정보 수정 요청
@Getter
@NoArgsConstructor
public class StudyInfoUpdateRequest {
    private Long studyId;
    private String title;
    private String description;
}
