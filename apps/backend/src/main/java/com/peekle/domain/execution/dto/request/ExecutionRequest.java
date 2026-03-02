package com.peekle.domain.execution.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutionRequest {
    private String language;
    private String code;
    private String input;
}
