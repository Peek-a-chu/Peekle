package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 스터디 삭제(폭파) 요청
@Getter
@NoArgsConstructor
public class StudyDeleteRequest {
    private Long studyId;
}
