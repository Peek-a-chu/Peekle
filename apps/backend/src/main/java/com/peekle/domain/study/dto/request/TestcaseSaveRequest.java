package com.peekle.domain.study.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TestcaseSaveRequest {
    private String id; // Frontend local ID (e.g. timestamp)
    private String input;
    private String expectedOutput;
}
