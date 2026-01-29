package com.peekle.global.socket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GlobalWebSocketListener {

    private final RedisTemplate<String, Object> redisTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();

        if (attributes != null && attributes.containsKey("userId")) {
            Long userId = (Long) attributes.get("userId");
            log.info("[Global] WebSocket Connected. Session ID: {}, User ID: {}", sessionId, userId);

            // 전역 세션 매핑 저장
            redisTemplate.opsForValue().set("user:" + userId + ":session", sessionId);
        } else {
            log.info("[Global] Anonymous WebSocket Connected. Session ID: {}", sessionId);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();

        if (attributes != null && attributes.containsKey("userId")) {
            Long userId = (Long) attributes.get("userId");
            log.info("[Global] WebSocket Disconnected. Session ID: {}, User ID: {}", sessionId, userId);

            // 전역 세션 매핑 삭제
            redisTemplate.delete("user:" + userId + ":session");
        }
    }
}
