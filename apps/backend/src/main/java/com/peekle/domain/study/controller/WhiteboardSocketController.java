package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.whiteboard.WhiteboardRequest;
import com.peekle.domain.study.service.WhiteboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.HashMap;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WhiteboardSocketController {

    private final WhiteboardService whiteboardService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/studies/whiteboard/message")
    public void handlerWhiteboardMessage(@Payload WhiteboardRequest request,
                                         SimpMessageHeaderAccessor headerAccessor) {

        // 1. 세션 검증 (인터셉터에서 넣어준 값 활용)
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

        // [Fix] 세션에 studyId가 없으면 헤더에서 확인 (Zustand로 관리된 studyId 활용)
        if (studyId == null) {
            String headerStudyId = headerAccessor.getFirstNativeHeader("studyId");
            if (headerStudyId != null) {
                try {
                    studyId = Long.parseLong(headerStudyId);
                } catch (NumberFormatException e) {
                    log.warn("Invalid studyId header: {}", headerStudyId);
                }
            }
        }

        if (studyId == null || userId == null) {
            log.warn("Whiteboard Action Rejected: Session/Header info missing. studyId={}, userId={}", studyId, userId);
            return;
        }

        try {
            // 2. Action에 따른 분기 처리
            switch (request.getAction()) {
                // --- 제어 기능 ---
                case "START":
                    whiteboardService.startWhiteboard(studyId, userId);
                    break;
//                case "CLOSE":
//                    whiteboardService.stopWhiteboard(studyId, userId);
//                    break;
                case "CLEAR":
                    whiteboardService.clearWhiteboard(studyId, userId);
                    break;

                // --- 상태 동기화 요청 ---
                case "SYNC":
                    // 중간 입장 유저가 "저 데이터 좀 주세요"라고 요청할 때
                    whiteboardService.getWhiteboardState(studyId, userId);
                    break;
                case "JOIN":
                    whiteboardService.getWhiteboardState(studyId, userId);
                    break;

                // --- 드로잉 이벤트 (여기가 중요!) ---
                // "DRAW" 대신 구체적인 액션을 모두 saveDrawEvent로 넘깁니다.
                case "ADDED":    // 도형 추가
                case "MODIFIED": // 도형 변형 (이동, 크기조절 등)
                case "REMOVED":  // 도형 삭제
                    whiteboardService.saveDrawEvent(studyId, userId, request);
                    break;

                default:
                    log.warn("Invalid Whiteboard Action: {}", request.getAction());
            }
        } catch (Exception e) {
            // 비즈니스 로직 에러(권한 없음 등)는 로그만 남기고, 소켓 연결은 끊지 않음
            log.error("Whiteboard Error [User: {}]", userId, e);
        }
    }

    @EventListener
    public void handleSessionSubscribeEvent(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();

        // 화이트보드 토픽 구독 감지 시 현재 상태 전송 (SYNC)
        // 명세표에 따라 사용자별 토픽(/topic/studies/rooms/{id}/whiteboard/{uid}) 구독 시에만 SYNC 전송
        if (destination != null && destination.matches("/topic/studies/rooms/\\d+/whiteboard/[a-zA-Z0-9-]+")) {
            Map<String, Object> attributes = headerAccessor.getSessionAttributes();
            if (attributes != null) {
                Long studyId = (Long) attributes.get("studyId");
                Long userId = (Long) attributes.get("userId");

                if (studyId != null && userId != null) {
                    whiteboardService.getWhiteboardState(studyId, userId);
                }
            }
        }
        // [New] 채팅방 구독 시 세션에 studyId를 자동으로 저장
        else if (destination != null && destination.matches("/topic/studies/rooms/\\d+/chat")) {
            try {
                String[] parts = destination.split("/");
                // /topic/studies/rooms/{id}/chat -> parts[4] is {id}
                Long studyId = Long.parseLong(parts[4]);
                Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
                if (sessionAttributes != null) {
                    sessionAttributes.put("studyId", studyId);
                    log.info("Chat subscription detected. Stored studyId: {} in session: {}", studyId, headerAccessor.getSessionId());
                }
            } catch (Exception e) {
                log.error("Failed to process chat subscription for destination: {}", destination, e);
            }
        }
    }
}
