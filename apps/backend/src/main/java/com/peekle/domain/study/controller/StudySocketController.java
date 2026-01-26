package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.chat.ChatMessageRequest;
import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.dto.curriculum.StudyProblemAddRequest;
import com.peekle.domain.study.dto.http.request.StudyRoomUpdateRequest;
import com.peekle.domain.study.dto.http.response.StudyRoomResponse;
import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.study.dto.socket.request.*;
import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.service.*;
import com.peekle.global.media.service.MediaService;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class StudySocketController {

        private final RedisPublisher redisPublisher;
        private final RedisTemplate<String, Object> redisTemplate;
        private final StudyRoomService studyRoomService;
        private final StudyMemberRepository studyMemberRepository;
        private final StudyCurriculumService studyCurriculumService;
        private final RedisIdeService redisIdeService;
        private final MediaService mediaService;
        private final SimpMessagingTemplate messagingTemplate;
        private final StudyChatService studyChatService; // Injected
        private final WhiteboardService whiteboardService; // Injected

        // 스터디 입장 알림
        @MessageMapping("/studies/enter")
        public void enter(@Payload StudyEnterRequest request,
                        SimpMessageHeaderAccessor headerAccessor) {
                // Session Attributes에서 userId 추출
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                if (userId == null) {
                        log.warn("Study Enter Failed: userId not found in session attributes.");
                        return;
                }

                Long studyId = request.getStudyId();

                // 0. 검증
                boolean isUserMember = studyMemberRepository.existsByStudyAndUser_Id(
                                StudyRoom.builder().id(studyId).build(), userId);

                if (!isUserMember) {
                        // ... (Error handling)
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR",
                                                        "Access Denied: You are not a member of this study."));
                        return;
                }

                // Session Attributes 저장
                headerAccessor.getSessionAttributes().put("studyId", studyId);
                headerAccessor.getSessionAttributes().put("userId", userId);

                // 1. Redis Presence
                redisTemplate.opsForSet().add("study:" + studyId + ":online_users", userId.toString());

                // 2. OpenVidu 및 초기화 (Bundled)
                try {
                        log.info("Try OpenVidu: study_{}, user_{}", studyId, userId);
                        String sessionId = "study_" + studyId;
                        mediaService.getOrCreateSession(sessionId);

                        Map<String, Object> userData = new HashMap<>();
                        userData.put("userId", userId);

                        String token = mediaService.createConnection(sessionId, userData);

                        // 1. OpenVidu Token
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("VIDEO_TOKEN", token));

                        // 2. Room Info
                        StudyRoomResponse roomInfo = studyRoomService
                                        .getStudyRoom(userId, studyId);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/info/" + userId,
                                        SocketResponse.of("ROOM_INFO", roomInfo));

                        // 3. Curriculum
                        List<ProblemStatusResponse> curriculum = studyCurriculumService
                                        .getDailyProblems(userId, studyId, java.time.LocalDate.now());
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/curriculum/" + userId,
                                        SocketResponse.of("CURRICULUM", curriculum));

                        // 4. IDE Restore
                        for (ProblemStatusResponse problem : curriculum) {
                                IdeResponse savedCode = redisIdeService.getCode(studyId,
                                                problem.getProblemId(), userId);
                                if (savedCode != null) {
                                        messagingTemplate.convertAndSend(
                                                        "/topic/studies/" + studyId + "/ide/" + userId,
                                                        SocketResponse.of("IDE", savedCode));
                                }
                        }

                        // 5. Whiteboard Restore (화이트보드 상태 동기화)
                        try {
                                whiteboardService.getWhiteboardState(studyId, userId);
                        } catch (Exception e) {
                                log.error("Whiteboard Restore Failed", e);
                        }

                } catch (Exception e) {
                        log.error("Enter Init Fail", e);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR", "Init Error: " + e.getMessage()));
                }

                // 5. [SYSTEM CHAT] 입장 메시지 전송 (초기화 여부 무관)
                try {
                        studyChatService.sendChat(studyId, userId,
                                        ChatMessageRequest.builder()
                                                        .content("님이 스터디에 입장하셨습니다.")
                                                        .type(StudyChatLog.ChatType.SYSTEM)
                                                        .build());
                } catch (Exception e) {
                        log.error("System Chat Error", e);
                }

                // 3. Pub/Sub (ENTER event)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + studyId),
                                SocketResponse.of("ENTER", userId));
        }

        // 스터디 정보 수정
        @MessageMapping("/studies/info/update")
        public void updateInfo(@Payload StudyInfoUpdateRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long studyId = request.getStudyId();
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                StudyRoomUpdateRequest serviceDto = new StudyRoomUpdateRequest(
                                request.getTitle(), request.getDescription());

                studyRoomService.updateStudyRoom(userId, studyId, serviceDto);

                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + studyId),
                                SocketResponse.of("INFO", request));
        }

        // 스터디 퇴장 알림
        @MessageMapping("/studies/leave")
        public void leave(@Payload StudyLeaveRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // 1. Redis Presence
                redisTemplate.opsForSet().remove("study:" + request.getStudyId() + ":online_users", userId.toString());

                // 2. Pub/Sub (LEAVE)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("LEAVE", userId));

                // 3. [SYSTEM CHAT] 퇴장 메시지
                studyChatService.sendChat(request.getStudyId(), userId,
                                ChatMessageRequest.builder()
                                                .content("님이 퇴장하셨습니다.")
                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                .build());
        }

        // 스터디 영구 탈퇴 (Quit)
        @MessageMapping("/studies/quit")
        public void quit(@Payload StudyQuitRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // [SYSTEM CHAT] 탈퇴 메시지 (멤버 삭제 전에 보내야 User 조회 가능)
                try {
                        studyChatService.sendChat(request.getStudyId(), userId,
                                        ChatMessageRequest.builder()
                                                        .content("님이 스터디를 탈퇴하셨습니다.")
                                                        .type(StudyChatLog.ChatType.SYSTEM)
                                                        .build());
                } catch (Exception e) {
                        /* 이미 삭제 등 에러 무시 */ }

                // 1. DB 삭제
                studyRoomService.leaveStudyRoom(userId, request.getStudyId());

                // 2. Redis Presence
                redisTemplate.opsForSet().remove("study:" + request.getStudyId() + ":online_users", userId.toString());

                // 3. 세션 정리
                if (headerAccessor.getSessionAttributes() != null) {
                        headerAccessor.getSessionAttributes().remove("studyId");
                }

                // 4. Pub/Sub (QUIT)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("QUIT", userId));
        }

        // 강퇴 알림
        @MessageMapping("/studies/kick")
        public void kickUser(@Payload StudyKickRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // [SYSTEM CHAT] 강퇴 메시지 (관리자가 보냄)
                // "관리자님이 {target}님을 강퇴했습니다"
                // -> Service에서 target 이름을 조회하기 복잡하므로 단순 알림
                studyChatService.sendChat(request.getStudyId(), userId,
                                ChatMessageRequest.builder()
                                                .content("님이 멤버를 강퇴했습니다.")
                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                .build());

                studyRoomService.kickMemberByUserId(userId, request.getStudyId(), request.getTargetUserId());

                redisTemplate.opsForSet().remove("study:" + request.getStudyId() + ":online_users",
                                request.getTargetUserId().toString());

                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("KICK", request.getTargetUserId()));
        }

        // 스터디 삭제 (방 폭파)
        @MessageMapping("/studies/delete")
        public void deleteRoom(@Payload StudyDeleteRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // [SYSTEM CHAT] 방 삭제 메시지
                studyChatService.sendChat(request.getStudyId(), userId,
                                ChatMessageRequest.builder()
                                                .content("님이 스터디를 삭제했습니다.")
                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                .build());

                // 1. Service
                studyRoomService.deleteStudyRoom(userId, request.getStudyId());

                // 2. Broadcast
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("DELETE", "Room Deleted"));

                redisTemplate.delete("study:" + request.getStudyId() + ":online_users");
        }

        // 스터디 문제 관리
        @MessageMapping("/studies/problems")
        public void handleProblem(@Payload CurriculumSocketRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

                if (userId == null || studyId == null)
                        return;

                try {
                        if ("ADD".equalsIgnoreCase(request.getAction())) {
                                StudyProblemAddRequest addRequest = StudyProblemAddRequest
                                                .builder()
                                                .problemId(request.getProblemId())
                                                .problemDate(request.getProblemDate())
                                                .build();

                                studyCurriculumService.addProblem(userId, studyId, addRequest);

                                // [SYSTEM] 문제 추가 알림
                                studyChatService.sendChat(studyId, userId,
                                                ChatMessageRequest.builder()
                                                                .content("님이 커리큘럼을 추가했습니다: " + request.getProblemId())
                                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                                .build());

                        } else if ("REMOVE".equalsIgnoreCase(request.getAction())) {
                                studyCurriculumService.removeProblem(userId, studyId, request.getProblemId());

                                // [SYSTEM] 문제 삭제 알림
                                studyChatService.sendChat(studyId, userId,
                                                ChatMessageRequest.builder()
                                                                .content("님이 커리큘럼을 삭제했습니다: " + request.getProblemId())
                                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                                .build());
                        }
                } catch (Exception e) {
                        log.error("Curriculum Socket Error: {}", e.getMessage());
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/error/" + userId,
                                        SocketResponse.of("ERROR", e.getMessage()));
                }
        }

        // 방장 권한 위임
        @MessageMapping("/studies/delegate")
        public void delegateLeader(@Payload StudyDelegateRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                studyRoomService.delegateLeader(userId, request.getStudyId(), request.getTargetUserId());

                // [SYSTEM] 위임 알림
                studyChatService.sendChat(request.getStudyId(), userId,
                                ChatMessageRequest.builder()
                                                .content("님이 방장 권한을 위임했습니다.")
                                                .type(StudyChatLog.ChatType.SYSTEM)
                                                .build());

                // Broadcast DELEGATE event
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("DELEGATE", request.getTargetUserId()));

                // Room Info Update
                StudyRoomResponse roomInfo = studyRoomService.getStudyRoom(userId, request.getStudyId());
                messagingTemplate.convertAndSend(
                                "/topic/studies/" + request.getStudyId() + "/info/" + userId,
                                SocketResponse.of("ROOM_INFO", roomInfo));
        }
}
