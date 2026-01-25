package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.dto.http.request.StudyRoomUpdateRequest;
import com.peekle.domain.study.dto.http.response.StudyRoomResponse;
import com.peekle.domain.study.dto.socket.request.*;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.service.StudyRoomService;
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
        private final com.peekle.domain.study.repository.StudyMemberRepository studyMemberRepository;
        private final com.peekle.domain.study.service.StudyCurriculumService studyCurriculumService;
        private final MediaService mediaService;
        private final SimpMessagingTemplate messagingTemplate;

        // 스터디 입장 알림
        @MessageMapping("/studies/enter")
        public void enter(@Payload StudyEnterRequest request,
                        SimpMessageHeaderAccessor headerAccessor) {
                // Session Attributes에서 userId 추출 (WebSocketEventListener에서 저장됨)
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                if (userId == null) {
                        // 세션에 userId가 없으면 비정상 접근 (혹은 재연결 필요)
                        log.warn("Study Enter Failed: userId not found in session attributes.");
                        return;
                }

                Long studyId = request.getStudyId();

                // 0. 검증: 해당 유저가 실제로 이 스터디의 멤버인지 확인
                boolean isMember = studyMemberRepository.existsByStudyAndUser_Id(
                                StudyRoom.builder().id(studyId).build(), userId);

                if (!isMember) {
                        log.warn("Unauthorized OpenVidu access attempt: User {} is not a member of Study {}", userId,
                                        studyId);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR",
                                                        "Access Denied: You are not a member of this study."));
                        return;
                }

                // Session Attributes에 studyId, userId 저장 (Disconnect 핸들링 용)
                headerAccessor.getSessionAttributes().put("studyId", studyId);
                headerAccessor.getSessionAttributes().put("userId", userId);

                // 1. Redis Presence: Online User 추가
                redisTemplate.opsForSet().add("study:" + studyId + ":online_users", userId.toString());

                // 2. OpenVidu 토큰 발급 및 전송 (Private)
                try {
                        log.info("Try OpenVidu: study_{}, user_{}", studyId, userId);
                        String sessionId = "study_" + studyId;
                        mediaService.getOrCreateSession(sessionId);

                        Map<String, Object> userData = new HashMap<>();
                        userData.put("userId", userId);

                        String token = mediaService.createConnection(sessionId, userData);
                        log.info("Token Success: {}", token);

                        // 1. OpenVidu Token 전송
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("VIDEO_TOKEN", token));

                        // 2. 스터디 방 정보 전송 (ROOM_INFO) - 초기 로딩
                        StudyRoomResponse roomInfo = studyRoomService
                                        .getStudyRoom(userId, studyId);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/info/" + userId,
                                        SocketResponse.of("ROOM_INFO", roomInfo));

                        // 3. 오늘의 커리큘럼 전송 (CURRICULUM) - 초기 로딩
                        List<ProblemStatusResponse> curriculum = studyCurriculumService
                                        .getDailyProblems(userId, studyId, java.time.LocalDate.now());
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/curriculum/" + userId,
                                        SocketResponse.of("CURRICULUM", curriculum));

                } catch (Exception e) {
                        log.error("Enter Init Fail", e);
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/video-token/" + userId,
                                        SocketResponse.of("ERROR", "Init Error: " + e.getMessage()));
                }

                // 3. Pub/Sub: 메시지 발행 (UserId 전송 -> 클라이언트가 해당 유저 Online 처리)
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

                // 1. Redis Presence: Online User 제거
                redisTemplate.opsForSet().remove("study:" + request.getStudyId() + ":online_users", userId.toString());

                // 2. Pub/Sub: 메시지 발행 (UserId 전송 -> 클라이언트가 해당 유저 Offline 처리)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("LEAVE", userId));
        }

        // 스터디 영구 탈퇴 (Quit)
        @MessageMapping("/studies/quit")
        public void quit(@Payload StudyQuitRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");

                // 1. DB에서 멤버 삭제
                studyRoomService.leaveStudyRoom(userId, request.getStudyId());

                // 2. Redis Presence: Online User 제거
                redisTemplate.opsForSet().remove("study:" + request.getStudyId() + ":online_users", userId.toString());

                // 3. 세션에서 studyId 제거 (Disconnect 시 중복 처리 방지)
                if (headerAccessor.getSessionAttributes() != null) {
                        headerAccessor.getSessionAttributes().remove("studyId");
                }

                // 4. Pub/Sub: 메시지 발행 (QUIT 타입 전송 -> 클라이언트가 해당 유저 목록에서 영구 제거)
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("QUIT", userId));
        }

        // 강퇴 알림
        @MessageMapping("/studies/kick")
        public void kickUser(@Payload StudyKickRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                studyRoomService.kickMemberByUserId(userId, request.getStudyId(), request.getTargetUserId());

                // 강퇴된 유저는 Online Users에서 바로 제거보다는 Disconnect 시점에 제거될 것임.
                // 혹은 여기서 강제 제거
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

                // 1. Service 호출 (DB Soft Delete & AOP Check)
                studyRoomService.deleteStudyRoom(userId, request.getStudyId());

                // 2. Broadcast (DELETE event)
                // 클라이언트에서 이 이벤트를 받으면 메인 화면으로 이동
                redisPublisher.publish(
                                new ChannelTopic("topic/studies/rooms/" + request.getStudyId()),
                                SocketResponse.of("DELETE", "Room Deleted"));

                // 3. (Optional) Redis Presence 전체 제거
                redisTemplate.delete("study:" + request.getStudyId() + ":online_users");
        }

        // 스터디 문제 관리 (WebSocket)
        @MessageMapping("/studies/problems")
        public void handleProblem(@Payload CurriculumSocketRequest request, SimpMessageHeaderAccessor headerAccessor) {
                Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
                Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

                if (userId == null || studyId == null) {
                        log.warn("Curriculum/handleProblem: userId or studyId is null in session. userId={}, studyId={}",
                                        userId, studyId);
                        return;
                }

                try {
                        if ("ADD".equalsIgnoreCase(request.getAction())) {
                                com.peekle.domain.study.dto.curriculum.StudyProblemAddRequest addRequest = com.peekle.domain.study.dto.curriculum.StudyProblemAddRequest
                                                .builder()
                                                .problemId(request.getProblemId())
                                                .problemDate(request.getProblemDate())
                                                .build();

                                studyCurriculumService.addProblem(userId, studyId, addRequest);

                        } else if ("REMOVE".equalsIgnoreCase(request.getAction())) {
                                studyCurriculumService.removeProblem(userId, studyId, request.getProblemId());
                        }
                } catch (Exception e) {
                        log.error("Curriculum Socket Error: {}", e.getMessage());
                        // Optional: Send error message to user via private topic
                        messagingTemplate.convertAndSend(
                                        "/topic/studies/" + studyId + "/error/" + userId,
                                        SocketResponse.of("ERROR", e.getMessage()));
                }
        }
}
