package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.chat.ChatMessageRequest;
import com.peekle.domain.study.service.StudyChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final StudyChatService studyChatService;

    // Send Chat
    @MessageMapping("/chat/message")
    public void sendMessage(@Payload ChatMessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (userId == null || studyId == null) {
            log.error("Chat Error: User or Study ID not found in session attributes. User: {}, Study: {}", userId,
                    studyId);
            return;
        }

        studyChatService.sendChat(studyId, userId, request);
    }
}
