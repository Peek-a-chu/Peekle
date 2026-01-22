package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.socket.request.StudyEnterRequest;
import com.peekle.domain.study.dto.socket.request.StudyInfoUpdateRequest;
import com.peekle.domain.study.dto.socket.request.StudyKickRequest;
import com.peekle.domain.study.dto.socket.request.StudyLeaveRequest;
import com.peekle.domain.study.dto.socket.response.SocketResponse;
import com.peekle.domain.study.service.StudyRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class StudySocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final StudyRoomService studyRoomService;

    // 스터디 입장 알림
    @MessageMapping("/study/enter")
    public void enter(StudyEnterRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        // 실제로는 headerAccessor에서 유저 정보를 가져와야 함 (Spring Security 연동 시)
        // 현재는 단순히 입장 메시지 전파 용도로 구현 (비즈니스 로직은 joinStudyRoom에서 처리됨)
        // 만약 joinStudyRoom 호출이 소켓 연결 전에 선행되었다면, 여기서는 알림만 보내면 됨.
        // 하지만 요구사항상 "입장" 시점에 소켓을 통해 알림을 보내야 한다면 여기서 broadcast.

        // TODO: headerAccessor.getUser() 등을 통해 userId 식별 필요
        // 임시로 userId 1L 가정 혹은 request에 포함되어야 함 (하지만 request엔 없음) -> 세션/헤더 사용
        // 여기서는 단순 broadcast 예시

        Long studyId = request.getStudyId();
        // 구독 경로: /topic/study/room/{id}/participants
        messagingTemplate.convertAndSend("/topic/study/room/" + studyId + "/participants",
                SocketResponse.of("ENTER", "User Entered"));
        // 상세 유저 정보는 DB 조회 후 전송 권장
    }

    // 스터디 정보 수정
    @MessageMapping("/study/info/update")
    public void updateInfo(StudyInfoUpdateRequest request) {
        Long studyId = request.getStudyId();
        // 권한 체크 및 업데이트는 Service에서 REST API로 수행하는 것이 일반적임
        // 만약 소켓으로 업데이트 요청을 받는다면:
        // studyRoomService.updateStudyRoom(userId, studyId, dto);

        // 업데이트 후 결과 브로드캐스트
        messagingTemplate.convertAndSend("/topic/study/room/" + studyId + "/info",
                SocketResponse.of("INFO", request));
    }

    // 스터디 퇴장 알림
    @MessageMapping("/study/leave")
    public void leave(StudyLeaveRequest request) {
        // Service 호출 (REST API로 선행 가능)
        // studyRoomService.leaveStudyRoom(userId, studyId);

        messagingTemplate.convertAndSend("/topic/study/room/" + request.getStudyId() + "/participants",
                SocketResponse.of("LEAVE", "User Left")); // User Info 권장
    }

    // 강퇴 알림
    @MessageMapping("/study/kick")
    public void kickUser(StudyKickRequest request) {
        // Service 로직 호출 (REST API로 선행되었을 수도 있음)
        // studyRoomService.kickMember(ownerId, ...);

        // 강퇴 이벤트 전파 -> 대상 클라이언트는 이를 수신하고 연결 종료 처리
        messagingTemplate.convertAndSend("/topic/study/room/" + request.getStudyId() + "/kick",
                SocketResponse.of("KICK", request.getTargetUserId()));
    }
}
