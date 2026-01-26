package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.whiteboard.WhiteboardRequest;
import com.peekle.domain.study.service.WhiteboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WhiteboardSocketController {

    private final WhiteboardService whiteboardService;

    @MessageMapping("/studies/whiteboard/message")
    public void handlerWhiteboardMessage(@Payload WhiteboardRequest request,
                                         SimpMessageHeaderAccessor headerAccessor) {
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

        if (studyId == null || userId == null) {
            log.warn("Whiteboard Action Rejected: Session not found. User must enter study first.");
            return;
        }

        try {
            switch (request.getType()) {
                case "START":
                    whiteboardService.startWhiteboard(studyId, userId);
                    break;
                case "STOP":
                    whiteboardService.stopWhiteboard(studyId, userId);
                    break;
                case "CLEAR":
                    whiteboardService.clearWhiteboard(studyId, userId);
                    break;
                case "DRAW":
                    whiteboardService.saveDrawEvent(studyId, request);
                    break;
                default:
                    log.warn("Invalid Whiteboard Type: {}", request.getType());
            }
        } catch (Exception e) {
            log.error("Whiteboard Error: {}", e.getMessage());
        }
    }
}
