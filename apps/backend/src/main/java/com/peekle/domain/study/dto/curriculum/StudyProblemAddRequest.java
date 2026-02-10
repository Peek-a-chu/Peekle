package com.peekle.domain.study.dto.curriculum;

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
    private LocalDate problemDate; // Optional (default: Today)
}
