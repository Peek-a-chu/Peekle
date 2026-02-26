package com.peekle.domain.study.dto.socket.request;

import com.peekle.domain.study.enums.ProblemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CurriculumSocketRequest {
    private String action; // ADD, REMOVE
    private Long problemId;
    private Long studyProblemId;
    private String customTitle;
    private String customLink;
    private ProblemType problemType; // BOJ, PGS, CUSTOM
    private LocalDate problemDate;
}
