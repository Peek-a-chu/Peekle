package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class StudyDelegateRequest {
    private Long studyId;
    private Long targetUserId;
}