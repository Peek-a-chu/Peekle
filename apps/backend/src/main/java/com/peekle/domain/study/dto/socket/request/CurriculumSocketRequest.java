package com.peekle.domain.study.dto.socket.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@ToString
public class CurriculumSocketRequest {
    private Long studyId;
    private Long problemId;
    private LocalDate problemDate; // Optional
    private String action; // "ADD" or "REMOVE"
}
