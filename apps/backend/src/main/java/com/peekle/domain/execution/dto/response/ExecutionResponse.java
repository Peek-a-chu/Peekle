package com.peekle.domain.execution.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutionResponse {
    private String stdout;
    private String stderr;
    private Integer exitCode;
    private Long executionTime;
}
