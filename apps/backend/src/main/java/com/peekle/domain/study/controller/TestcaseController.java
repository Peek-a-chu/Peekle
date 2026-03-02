package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.request.TestcaseSaveRequest;
import com.peekle.domain.study.dto.response.TestcaseResponse;
import com.peekle.domain.study.service.TestcaseService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies/{roomId}/problems/{problemId}/testcases")
public class TestcaseController {

    private final TestcaseService testcaseService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ApiResponse<List<TestcaseResponse>> getTestcases(
            @PathVariable Long roomId,
            @PathVariable Long problemId) {
        List<TestcaseResponse> responses = testcaseService.getTestcases(roomId, problemId);
        return ApiResponse.success(responses);
    }

    @PostMapping
    public ApiResponse<Void> saveTestcases(
            @PathVariable Long roomId,
            @PathVariable Long problemId,
            @RequestBody List<TestcaseSaveRequest> requests) {
        testcaseService.saveTestcases(roomId, problemId, requests);

        // Broadcast testcase update to other participants in the room
        messagingTemplate.convertAndSend("/topic/studies/" + roomId + "/testcases", "UPDATED");

        return ApiResponse.success(null);
    }
}
