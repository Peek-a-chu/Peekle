package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.chat.ChatMessageResponse;
import com.peekle.domain.study.service.StudyChatService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyChatController {

    private final StudyChatService studyChatService;

    @GetMapping("/{studyId}/chats")
    public ApiResponse<Page<ChatMessageResponse>> getChatHistory(
            @PathVariable Long studyId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        // Note: For Page 0 (latest), we might get them from Redis in reverse order
        // (Newest -> Oldest).
        // The service layer handles this hybrid logic.
        Page<ChatMessageResponse> result = studyChatService.getChatHistory(studyId, pageable);
        return ApiResponse.success(result);
    }
}
