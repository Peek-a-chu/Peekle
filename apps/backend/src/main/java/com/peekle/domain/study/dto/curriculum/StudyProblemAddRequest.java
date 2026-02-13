package com.peekle.domain.study.dto.curriculum;

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
public class StudyProblemAddRequest {
    private Long problemId;
    private String customTitle;
    private String customLink;
    private ProblemType problemType; // BOJ, PGS, or CUSTOM
    private LocalDate problemDate; // Optional (default: Today)
}
