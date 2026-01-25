package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.ide.IdeRequest;
import com.peekle.domain.study.dto.ide.IdeResponse;
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

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationSocketController {

    private final RedisIdeService redisIdeService;
    private final RedisPublisher redisPublisher;

    @MessageMapping("/ide/update")
    public void updateIde(@Payload IdeRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (userId == null || studyId == null) {
            log.error("IDE Update Error: Session attributes missing. User: {}, Study: {}", userId, studyId);
            return;
        }

        // 1. Save to Redis (For persistence/refresh)
        redisIdeService.saveCode(studyId, userId, request);

        // 2. Publish to Redis Topic (Broadcasting to subscribers)
        // Topic: topic/studies/rooms/{studyId}/ide/{userId}
        String topic = String.format(RedisKeyConst.TOPIC_IDE, studyId, userId);

        // Create Payload
        // Note: SenderName isn't in Request, but clients usually know who they are
        // watching or we can fetch it.
        // For performance, we might skip fetching User entity if nickname isn't
        // strictly needed for the editor sync itself.
        // But to be complete, let's just send what we have.
        // If needed, we can fetch nickname from Redis session or DB.

        // Construct partial response or fetch full if needed.
        // Let's rely on the service to get full response OR just forward the update
        // content with ID.
        // For efficiency, just forwarding might be enough, but let's stick to
        // consistent IdeResponse structure.
        // We will fetch senderName efficiently?
        // RedisIdeService.getCode() fetches User from DB. Calling it every keystroke is
        // heavy.
        // Optimization: Just send the data. Client knows who they subbed to.

        IdeResponse response = IdeResponse.builder()
                .senderId(userId)
                .senderName("Unknown") // Optimization: Skip DB lookup for high-frequency updates
                .filename(request.getFilename())
                .code(request.getCode())
                .lang(request.getLang())
                .build();

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("IDE", response));
    }

    // Watch Event (Start/Stop watching someone)
    @MessageMapping("/ide/watch")
    public void handleWatch(@Payload com.peekle.domain.study.dto.ide.IdeWatchRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long viewerId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (viewerId == null || studyId == null || request.getTargetUserId() == null) {
            return;
        }

        Long targetId = request.getTargetUserId();

        // 1. Update Redis State
        if ("START".equalsIgnoreCase(request.getAction())) {
            redisIdeService.addWatcher(studyId, targetId, viewerId);
        } else if ("STOP".equalsIgnoreCase(request.getAction())) {
            redisIdeService.removeWatcher(studyId, targetId, viewerId);
        }

        // 2. Notify the Target User ("Someone is watching you!")
        // Topic: topic/studies/rooms/{studyId}/ide/{targetId}/status
        // Or simply reuse the personal topic if the client listens to it?
        // Let's use a specific status topic or the existing ide ONE.
        // Usually, the target user wants to know who is watching ME.
        // So target subscribes to: /topic/.../ide/{myId}/watchers

        String topic = String.format("topic/studies/rooms/%d/ide/%d/watchers", studyId, targetId);

        java.util.Set<String> watchers = redisIdeService.getWatchers(studyId, targetId);

        // Payload: { type: "WATCH_UPDATE", data: { count: 3, viewers: [1, 5, ...] } }
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("count", watchers.size());
        data.put("viewers", watchers);

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("WATCH_UPDATE", data));
    }
}
