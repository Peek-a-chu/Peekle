package com.peekle.domain.execution.controller;

import com.peekle.domain.execution.dto.request.ExecutionRequest;
import com.peekle.domain.execution.dto.response.ExecutionResponse;
import com.peekle.domain.execution.service.ExecutionService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/executions")
public class ExecutionController {

    private final ExecutionService executionService;

    @PostMapping("/run")
    public ApiResponse<ExecutionResponse> runCode(@RequestBody ExecutionRequest request) {
        ExecutionResponse response = executionService.execute(request);
        return ApiResponse.success(response);
    }
}
