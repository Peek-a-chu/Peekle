package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.http.request.StudyRoomUpdateRequest;
import com.peekle.domain.study.dto.socket.request.*;
import com.peekle.domain.study.service.StudyRoomService;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class StudySocketController {

        private final RedisPublisher redisPublisher;
        private final RedisTemplate<String, Object> redisTemplate;
        private final StudyRoomService studyRoomService;
        private final com.peekle.domain.study.repository.StudyMemberRepository studyMemberRepository;

        // 스터디 입장 알림
        @MessageMapping("/studies/enter")
        public void enter(@Payload StudyEnterRequest request,
                        SimpMessageHeaderAccessor headerAccessor) {
                // Header에서 userId 추출 (없으면 기본값 1L - 테스트 편의성)
                String userIdHeader = headerAccessor.getFirstNativeHeader("X-User-Id");
                Long userId = userIdHeader != null ? Long.parseLong(userIdHeader) : 1L;

                Long studyId = request.getStudyId();

                // 0. 검증: 해당 유저가 실제로 이 스터디의 멤버인지 확인
                boolean isMember = studyMemberRepository.existsByStudyAndUser_Id(
                                com.peekle.domain.study.entity.StudyRoom.builder().id(studyId).build(), userId);

                if (!isMember) {
                        // 멤버가 아니면 진행하지 않음.
                        // TODO: 에러 메시지를 클라이언트에게 전송할 수 있으면 좋음 (Errors Queue)
                        // 현재는 단순히 무시하거나 로그 남김
                        // log.warn("Unauthorized enter attempt: User {} to Study {}", userId, studyId);
                        return;
                }

                // Session Attributes에 studyId, userId 저장 (Disconnect 핸들링 용)
                headerAccessor.getSessionAttributes().put("studyId", studyId);
                headerAccessor.getSessionAttributes().put("userId", userId);

                // 1. Redis Presence: Online User 추가
                redisTemplate.opsForSet().add("study:" + studyId + ":online_users", userId.toString());
                // 2. Pub/Sub: 메시지 발행 (UserId 전송 -> 클라이언트가 해당 유저 Online 처리)
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
}
