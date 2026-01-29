package com.peekle.global.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class StompHandler implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String userId = accessor.getFirstNativeHeader("userId");
            String studyId = accessor.getFirstNativeHeader("studyId");
            
            log.info("[StompHandler] Connect request: userId={}, studyId={}", userId, studyId);

            if (userId != null && studyId != null) {
                Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                if (sessionAttributes != null) {
                    try {
                        sessionAttributes.put("userId", Long.valueOf(userId));
                        sessionAttributes.put("studyId", Long.valueOf(studyId));
                        log.info("[StompHandler] Session attributes set successfully");
                    } catch (NumberFormatException e) {
                        log.error("[StompHandler] Invalid format for userId or studyId");
                    }
                }
            } else {
                log.warn("[StompHandler] Missing headers in CONNECT frame");
            }
        }
        return message;
    }
}
