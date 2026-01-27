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

        // 1. 세션 검증 (인터셉터에서 넣어준 값 활용)
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

        if (studyId == null || userId == null) {
            log.warn("Whiteboard Action Rejected: Session not found.");
            return;
        }

        try {
            // 2. Action에 따른 분기 처리
            switch (request.getAction()) {
                // --- 제어 기능 ---
                case "START":
                    whiteboardService.startWhiteboard(studyId, userId);
                    break;
                case "CLOSE":
                    whiteboardService.stopWhiteboard(studyId, userId);
                    break;
                case "CLEAR":
                    whiteboardService.clearWhiteboard(studyId, userId);
                    break;

                // --- 상태 동기화 요청 ---
                case "SYNC":
                    // 중간 입장 유저가 "저 데이터 좀 주세요"라고 요청할 때
                    whiteboardService.getWhiteboardState(studyId, userId);
                    break;

                // --- 드로잉 이벤트 (여기가 중요!) ---
                // "DRAW" 대신 구체적인 액션을 모두 saveDrawEvent로 넘깁니다.
                case "ADDED":    // 도형 추가
                case "MODIFIED": // 도형 변형 (이동, 크기조절 등)
                case "REMOVED":  // 도형 삭제
                case "CURSOR":   // 마우스 커서 이동
                    whiteboardService.saveDrawEvent(studyId, userId, request);
                    break;

                default:
                    log.warn("Invalid Whiteboard Action: {}", request.getAction());
            }
        } catch (Exception e) {
            // 비즈니스 로직 에러(권한 없음 등)는 로그만 남기고, 소켓 연결은 끊지 않음
            log.error("Whiteboard Error [User: {}]: {}", userId, e.getMessage());
        }
    }
}
