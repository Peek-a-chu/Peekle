package com.peekle.domain.study.socket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final com.peekle.global.redis.RedisPublisher redisPublisher;

    // 연결 연결 시 (SUBSCRIBEFrame이 아니라 최초 socket 연결 handshake 완료 시점, 혹은 CONNECTED)
    // 여기서 userId와 sessionId 매핑을 저장
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        // Native Headers 확인 (디버깅)
        // GenericMessage의 headers에 nativeHeaders가 들어있음.
        log.info("Headers: {}", headerAccessor.getMessageHeaders());

        // 1. Prepare to access nested CONNECT message if needed
        StompHeaderAccessor connectAccessor = null;
        Object connectMessageObj = headerAccessor.getHeader("simpConnectMessage");
        if (connectMessageObj instanceof org.springframework.messaging.Message) {
            connectAccessor = StompHeaderAccessor.wrap((org.springframework.messaging.Message<?>) connectMessageObj);
        }

        // 2. Try to get User ID
        String userIdStr = headerAccessor.getFirstNativeHeader("X-User-Id");
        if (userIdStr == null && connectAccessor != null) {
            userIdStr = connectAccessor.getFirstNativeHeader("X-User-Id");
        }

        // 3. Try to get Study ID
        String studyIdStr = headerAccessor.getFirstNativeHeader("X-Study-Id");
        if (studyIdStr == null && connectAccessor != null) {
            studyIdStr = connectAccessor.getFirstNativeHeader("X-Study-Id");
        }
        Long studyId = (studyIdStr != null) ? Long.parseLong(studyIdStr) : null;

        Long userId = (userIdStr != null) ? Long.parseLong(userIdStr) : null;

        if (userId != null) {
            log.info("Received a new web socket connection. Session ID: {}, User ID: {}", sessionId, userId);
            redisTemplate.opsForValue().set("user:" + userId + ":session", sessionId);

            // 3. Fix NPE: Get mutable session attributes from whichever accessor has them
            java.util.Map<String, Object> attributes = headerAccessor.getSessionAttributes();
            if (attributes == null && connectAccessor != null) {
                attributes = connectAccessor.getSessionAttributes();
            }

            if (attributes != null) {
                attributes.put("userId", userId);
                if (studyId != null) {
                    attributes.put("studyId", studyId);
                }
            } else {
                log.warn("Failed to set userId in session attributes: Map is null");
            }
        } else {
            log.info("Received a new web socket connection. Session ID: {} (Anonymous)", sessionId);
        }
    }

    // 연결 종료 시
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        Object userIdObj = headerAccessor.getSessionAttributes() != null
                ? headerAccessor.getSessionAttributes().get("userId")
                : null;
        Object studyIdObj = headerAccessor.getSessionAttributes() != null
                ? headerAccessor.getSessionAttributes().get("studyId")
                : null;

        if (userIdObj != null) {
            Long userId = (Long) userIdObj;
            log.info("Web socket connection disconnected. Session ID: {}, User ID: {}", sessionId, userId);

            // 1. Session 매핑 삭제
            redisTemplate.delete("user:" + userId + ":session");

            // 2. 스터디 방에 있었다면 Online Users 제거 및 퇴장 알림
            if (studyIdObj != null) {
                Long studyId = (Long) studyIdObj;
                redisTemplate.opsForSet().remove("study:" + studyId + ":online_users", userId.toString());

                redisPublisher.publish(
                        new org.springframework.data.redis.listener.ChannelTopic("topic/studies/rooms/" + studyId),
                        com.peekle.global.socket.SocketResponse.of("LEAVE", userId));

                // 3. IDE 관찰자 목록 정리 (Cleanup Watchers)
                cleanUpWatchers(studyId, userId);
            }
        } else {
            log.info("Web socket connection disconnected. Session ID: {} (Anonymous)", sessionId);
        }
    }

    private void cleanUpWatchers(Long studyId, Long viewerId) {
        // We need RedisIdeService logic here.
        // Logic:
        // 1. Get targets I am watching: SMEMBERS user:{viewerId}:watching:{studyId}
        // 2. For each target, SREM study:{studyId}:ide:{target}:watchers {viewerId}
        // 3. Notify each target? (Ideally yes, but might be too many messages on
        // disconnect)
        // 4. DEL user:{viewerId}:watching:{studyId}

        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        java.util.Set<Object> targets = redisTemplate.opsForSet().members(viewerKey);

        if (targets != null) {
            for (Object targetObj : targets) {
                String targetIdStr = targetObj.toString();
                String targetWatcherKey = String.format(com.peekle.global.redis.RedisKeyConst.IDE_WATCHERS, studyId,
                        Long.parseLong(targetIdStr));

                redisTemplate.opsForSet().remove(targetWatcherKey, viewerId.toString());

                // Optional: Notify target that viewer count decreased
                // If specific bean injection is hard, we might skip notification for now,
                // but counts will be eventually consistent or updated next time someone joins.
                // Better to notify.

                // Re-calculate count
                Long size = redisTemplate.opsForSet().size(targetWatcherKey);

                String topic = String.format("topic/studies/rooms/%d/ide/%s/watchers", studyId, targetIdStr);
                java.util.Map<String, Object> data = new java.util.HashMap<>();
                data.put("count", size);
                // We don't send full list on disconnect to save bandwidth, or maybe just count
                // is enough.

                redisPublisher.publish(
                        new org.springframework.data.redis.listener.ChannelTopic(topic),
                        com.peekle.global.socket.SocketResponse.of("WATCH_UPDATE", data));
            }
            redisTemplate.delete(viewerKey);
        }
    }
}
