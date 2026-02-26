package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.ide.IdeRequest;
import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.study.dto.ide.IdeWatchRequest;
import com.peekle.domain.study.service.RedisIdeService;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.Set;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationSocketController {

    private final RedisIdeService redisIdeService;
    private final RedisPublisher redisPublisher;

    @MessageMapping("/ide/update")
    public void updateIde(@Payload IdeRequest request, SimpMessageHeaderAccessor headerAccessor) {
        // ... (Existing code) ...
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (userId == null || studyId == null) {
            log.error("IDE Update Error: Session attributes missing. User: {}, Study: {}", userId, studyId);
            return;
        }

        // 1. Redis에 저장 (영속성/새로고침 시 복원용)
        redisIdeService.saveCode(studyId, userId, request);

        // 2. Redis 토픽에 발행 (구독자들에게 브로드캐스팅)
        // 토픽: topic/studies/rooms/{studyId}/ide/{userId}
        String topic = String.format(RedisKeyConst.TOPIC_IDE, studyId, userId);

        // Safe check for problemId
        Long problemId = (request.getProblemId() != null) ? request.getProblemId() : 0L;

        IdeResponse response = IdeResponse.builder()
                .senderId(userId)
                .senderName("Unknown")
                .problemId(problemId)
                .filename(request.getFilename())
                .code(request.getCode())
                .lang(request.getLang())
                .build();

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("IDE", response));
    }

    // 관찰 시작/종료 이벤트 (Watch Event)
    @MessageMapping("/ide/watch")
    public void handleWatch(@Payload IdeWatchRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long viewerId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (viewerId == null || studyId == null || request.getTargetUserId() == null) {
            return;
        }

        Long targetId = request.getTargetUserId();

        // 1. Redis 상태 업데이트
        if ("START".equalsIgnoreCase(request.getAction())) {
            redisIdeService.addWatcher(studyId, targetId, viewerId);
        } else if ("STOP".equalsIgnoreCase(request.getAction())) {
            redisIdeService.removeWatcher(studyId, targetId, viewerId);
        }

        // 2. 대상 유저에게 알림 ("누군가 당신을 보고 있습니다!")
        String topic = String.format("topic/studies/rooms/%d/ide/%d/watchers", studyId, targetId);
        Set<String> watchers = redisIdeService.getWatchers(studyId, targetId);

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("count", watchers.size());
        data.put("viewers", watchers);

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("WATCH_UPDATE", data));
    }

    // [New] Snapshot Request over WebSocket
    @MessageMapping("/ide/request-snapshot")
    public void requestSnapshot(@Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        Long requesterId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (requesterId == null || studyId == null || !payload.containsKey("targetUserId")) {
            return;
        }

        try {
            Long targetUserId = Long.valueOf(payload.get("targetUserId").toString());
            Long problemId = payload.containsKey("problemId") ? Long.valueOf(payload.get("problemId").toString()) : 0L;

            // Redis Fetch
            IdeResponse snapshot = redisIdeService.getCode(studyId, problemId, targetUserId);

            if (snapshot != null) {
                // Topic: topic/studies/rooms/{studyId}/ide/{requesterId}/snapshot
                String responseTopic = String.format("topic/studies/rooms/%d/ide/%d/snapshot", studyId, requesterId);
                redisPublisher.publish(new ChannelTopic(responseTopic), SocketResponse.of("IDE_SNAPSHOT", snapshot));
            }
        } catch (Exception e) {
            log.error("Snapshot Request Error", e);
        }
    }
}
