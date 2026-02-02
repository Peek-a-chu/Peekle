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
import io.openvidu.java.client.Connection;
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
        private final com.peekle.domain.user.repository.UserRepository userRepository; // Custom injection

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
                // [Access Control] Check if user is already in another study
                String activeStudyKey = "user:" + userId + ":active_study";
                Object currentActiveStudy = redisTemplate.opsForValue().get(activeStudyKey);

                if (currentActiveStudy != null && !String.valueOf(studyId).equals(currentActiveStudy.toString())) {
                        log.warn("User {} is already in study {}", userId, currentActiveStudy);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR", "이미 다른 스터디에 참여 중입니다."));
                        return;
                }

                // Mark as Active
                redisTemplate.opsForValue().set(activeStudyKey, String.valueOf(studyId));
                redisTemplate.opsForSet().add("study:" + studyId + ":online_users", userId.toString());

                // 2. OpenVidu 및 초기화 (Bundled)
                try {
                        log.info("Try OpenVidu: study_{}, user_{}", studyId, userId);
                        String sessionId = "study_" + studyId;
                        mediaService.getOrCreateSession(sessionId);

                        Map<String, Object> userData = new HashMap<>();
                        userData.put("userId", userId);

                        Connection connection = mediaService.createConnection(sessionId, userData);
                        String token = connection.getToken();

                        // Connection ID 저장 (Redis Hash)
                        redisTemplate.opsForHash().put("study:" + studyId + ":connection_ids", userId.toString(), connection.getConnectionId());

                        // 1. OpenVidu Token
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("VIDEO_TOKEN", token));
                } catch (Exception e) {
                        log.error("OpenVidu initialization failed for study_{}, user_{}: {}", studyId, userId,
                                        e.getMessage(), e);
                        String errorMessage = e.getMessage();
                        if (errorMessage == null || errorMessage.isEmpty()) {
                                errorMessage = e.getClass().getSimpleName();
                        }
                        log.error("OpenVidu initialization failed for study_{}, user_{}: {}", studyId, userId, errorMessage, e);
                        
                        // 더 명확한 에러 메시지 제공
                        String userFriendlyMessage = "OpenVidu 서버 연결 실패";
                        if (errorMessage.contains("Connection") || errorMessage.contains("connect")) {
                                userFriendlyMessage = "OpenVidu 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.";
                        } else if (errorMessage.contains("401") || errorMessage.contains("Unauthorized")) {
                                userFriendlyMessage = "OpenVidu 인증 실패. SECRET 설정을 확인해주세요.";
                        } else if (errorMessage.contains("404") || errorMessage.contains("Not Found")) {
                                userFriendlyMessage = "OpenVidu 서버를 찾을 수 없습니다. URL 설정을 확인해주세요.";
                        }
                        
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR", "Init Error: " + userFriendlyMessage));
                        // OpenVidu 실패해도 다른 초기화는 계속 진행
                }

                try {
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
                        String nickname = "알 수 없는 사용자";
                        try {
                                nickname = userRepository.findById(userId)
                                                .map(com.peekle.domain.user.entity.User::getNickname)
                                                .orElse("알 수 없는 사용자");
                        } catch (Exception e) {
                                log.error("User Fetch Failed", e);
                        }

                        studyChatService.sendChat(studyId, userId,
                                        ChatMessageRequest.builder()
                                                        .content(nickname + "님이 스터디에 입장하셨습니다.")
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
                String onlineKey = "study:" + request.getStudyId() + ":online_users";
                redisTemplate.opsForSet().remove(onlineKey, userId.toString());
                redisTemplate.delete("user:" + userId + ":active_study");

                // [Auto-Clean] 마지막 사람이 나갔으면 화이트보드 데이터 정리
                Long remainingUsers = redisTemplate.opsForSet().size(onlineKey);
                if (remainingUsers != null && remainingUsers == 0) {
                        log.info("Study Room {} is empty. Scheduling whiteboard cleanup...", request.getStudyId());
                        whiteboardService.scheduleCleanup(request.getStudyId());
                }

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

                // 4. OpenVidu Force Disconnect
                mediaService.evictUser(request.getStudyId(), userId);
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
                String onlineKey = "study:" + request.getStudyId() + ":online_users";
                redisTemplate.opsForSet().remove(onlineKey, userId.toString());
                redisTemplate.delete("user:" + userId + ":active_study");

                // [Auto-Clean] 마지막 사람이 나갔으면 화이트보드 데이터 정리
                Long remainingUsers = redisTemplate.opsForSet().size(onlineKey);
                if (remainingUsers != null && remainingUsers == 0) {
                        log.info("Study Room {} is empty (Quit). Scheduling whiteboard cleanup...",
                                        request.getStudyId());
                        whiteboardService.scheduleCleanup(request.getStudyId());
                }

                // 3. 세션 정리
                if (headerAccessor.getSessionAttributes() != null) {
                        headerAccessor.getSessionAttributes().remove("studyId");
                }

                // 4. Pub/Sub (QUIT)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("QUIT", userId));

                // 5. OpenVidu Force Disconnect
                mediaService.evictUser(request.getStudyId(), userId);
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
                redisTemplate.delete("user:" + request.getTargetUserId() + ":active_study");

                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("KICK", request.getTargetUserId()));

                // OpenVidu Force Disconnect (Kick target)
                mediaService.evictUser(request.getStudyId(), request.getTargetUserId());
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

        // 전체 음소거 (방장 전용)
        @MessageMapping("/studies/mute-all")
        public void muteAll(@Payload StudyMuteAllRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // 권한 검증 (Service에 위임하거나 직접 확인)
                // 여기서는 간단히 Room 정보를 가져와서 Owner 비교
                StudyRoomResponse roomInfo = studyRoomService.getStudyRoom(userId, request.getStudyId());
                if (roomInfo.getOwner().getId().equals(userId)) {
                        // [SYSTEM] 전체 음소거 알림
                        studyChatService.sendChat(request.getStudyId(), userId,
                                        ChatMessageRequest.builder()
                                                        .content("님이 전체 음소거를 실행했습니다.")
                                                        .type(StudyChatLog.ChatType.SYSTEM)
                                                        .build());

                        // Broadcast MUTE_ALL
                        redisPublisher.publish(
                                        new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                        SocketResponse.of("MUTE_ALL", userId)); // senderId
                }
        }
}
