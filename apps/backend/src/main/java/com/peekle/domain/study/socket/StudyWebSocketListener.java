package com.peekle.domain.study.socket;

import com.peekle.domain.study.service.WhiteboardService;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
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

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final WhiteboardService whiteboardService;

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

            // 1. 스터디 방 온라인 유저 목록에서 제거
            String onlineKey = "study:" + studyId + ":online_users";
            redisTemplate.opsForSet().remove(onlineKey, userId.toString());
            
            redisTemplate.delete("user:" + userId + ":active_study");

            // [Auto-Clean] 마지막 사람이 나갔으면 화이트보드 데이터 정리
            Long remainingUsers = redisTemplate.opsForSet().size(onlineKey);
            if (remainingUsers != null && remainingUsers == 0) {
                log.info("Study Room {} is empty (Disconnect). Scheduling whiteboard cleanup...", studyId);
                whiteboardService.scheduleCleanup(studyId);
            }

            // 2. 다른 유저들에게 퇴장 알림 전송
            redisPublisher.publish(
                    new ChannelTopic("topic/studies/rooms/" + studyId),
                    SocketResponse.of("LEAVE", userId));

            // 3. IDE 관찰자(Watcher) 목록 정리
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
