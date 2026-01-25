package com.peekle.domain.study.dto.curriculum;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CurriculumSocketResponse {
    private String type; // "ADD", "REMOVE"
    private ProblemStatusResponse data; // Detail of added/removed problem
}
