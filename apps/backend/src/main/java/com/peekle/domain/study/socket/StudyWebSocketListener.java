package com.peekle.domain.study.socket;

import com.peekle.domain.study.service.WhiteboardService;
import com.peekle.global.media.service.MediaService;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class StudyWebSocketListener {

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final WhiteboardService whiteboardService;
    private final MediaService mediaService;

    // 연결 시 스터디 관련 처리
    @EventListener
    public void handleWebSocketConnectListener(org.springframework.web.socket.messaging.SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();

        if (attributes == null) {
            return;
        }

        Object userIdObj = attributes.get("userId");
        Object studyIdObj = attributes.get("studyId");

        if (userIdObj != null && studyIdObj != null) {
            Long userId = (Long) userIdObj;
            Long studyId = (Long) studyIdObj;

            log.info("[Study] User connected to study. Study ID: {}, User ID: {}", studyId, userId);

            // 1. 스터디 방 온라인 유저 목록에 추가
            String onlineKey = "study:" + studyId + ":online_users";
            stringRedisTemplate.opsForSet().add(onlineKey, userId.toString());

            // 2. 유저의 현재 활성 스터디 설정
            stringRedisTemplate.opsForValue().set("user:" + userId + ":active_study", studyId.toString());

            // 3. 다른 유저들에게 입장 알림 전송 (JOIN -> ENTER)
            redisPublisher.publish(
                    new ChannelTopic("topic/studies/rooms/" + studyId),
                    SocketResponse.of("ENTER", userId));
        }
    }

    // 연결 종료 시 스터디 관련 정리
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();

        if (attributes == null) {
            return;
        }

        Object userIdObj = attributes.get("userId");
        Object studyIdObj = attributes.get("studyId");

        if (userIdObj != null && studyIdObj != null) {
            Long userId = (Long) userIdObj;
            Long studyId = (Long) studyIdObj;

            log.info("[Study] User disconnected from study. Study ID: {}, User ID: {}", studyId, userId);

            // [Fix] Session Validation
            String currentSessionId = event.getSessionId(); // Use event ID directly
            String sessionKey = String.format(RedisKeyConst.USER_SESSION, userId);
            String initialSessionId = stringRedisTemplate.opsForValue().get(sessionKey);

            log.info("[Study] Disconnect Check - User: {}, Current: {}, Active: {}", userId, currentSessionId,
                    initialSessionId);

            if (currentSessionId != null && initialSessionId != null && !currentSessionId.equals(initialSessionId)) {
                log.info("[Study] Disconnect ignored. New session active. (Current: {}, Active: {})", currentSessionId,
                        initialSessionId);
                return;
            }

            // Session Clean up (Only delete if it matches)
            if (currentSessionId != null && currentSessionId.equals(initialSessionId)) {
                log.info("[Study] Session Match. Cleaning up session key.");
                stringRedisTemplate.delete(sessionKey);
            } else if (initialSessionId == null) {
                log.info("[Study] No active session found. Proceeding with disconnect cleanup.");
            }

            // 1. 스터디 방 온라인 유저 목록에서 제거
            String onlineKey = "study:" + studyId + ":online_users";
            stringRedisTemplate.opsForSet().remove(onlineKey, userId.toString());

            stringRedisTemplate.delete("user:" + userId + ":active_study");

            // [Auto-Clean] 마지막 사람이 나갔으면 화이트보드 데이터 정리
            Long remainingUsers = stringRedisTemplate.opsForSet().size(onlineKey);
            if (remainingUsers != null && remainingUsers == 0) {
                log.info("Study Room {} is empty (Disconnect). Scheduling whiteboard cleanup...", studyId);
                whiteboardService.scheduleCleanup(studyId);
            }

            // 2. 다른 유저들에게 퇴장 알림 전송
            redisPublisher.publish(
                    new ChannelTopic("topic/studies/rooms/" + studyId),
                    SocketResponse.of("LEAVE", userId));

            // 3. 화상 채팅 강제 연결 종료 (중복 방지)
            try {
                mediaService.evictUser(studyId, userId);
            } catch (Exception e) {
                log.warn("Media Evict Error: {}", e.getMessage());
            }

            // 4. IDE 관찰자(Watcher) 목록 정리
            cleanUpWatchers(studyId, userId);
        }
    }

    private void cleanUpWatchers(Long studyId, Long viewerId) {
        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        Set<Object> targets = redisTemplate.opsForSet().members(viewerKey);

        if (targets != null) {
            for (Object targetObj : targets) {
                String targetIdStr = targetObj.toString();
                String targetWatcherKey = String.format(RedisKeyConst.IDE_WATCHERS, studyId,
                        Long.parseLong(targetIdStr));

                redisTemplate.opsForSet().remove(targetWatcherKey, viewerId.toString());

                // 남은 관찰자 수 계산
                Long size = redisTemplate.opsForSet().size(targetWatcherKey);

                String topic = String.format("topic/studies/rooms/%d/ide/%s/watchers", studyId, targetIdStr);
                Map<String, Object> data = new HashMap<>();
                data.put("count", size);

                redisPublisher.publish(
                        new ChannelTopic(topic),
                        SocketResponse.of("WATCH_UPDATE", data));
            }
            redisTemplate.delete(viewerKey);
        }
    }
}
