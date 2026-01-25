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

        // 1. Redis에 저장 (영속성/새로고침 시 복원용)
        redisIdeService.saveCode(studyId, userId, request);

        // 2. Redis 토픽에 발행 (구독자들에게 브로드캐스팅)
        // 토픽: topic/studies/rooms/{studyId}/ide/{userId}
        String topic = String.format(RedisKeyConst.TOPIC_IDE, studyId, userId);

        // 응답 생성
        // 참고: SenderName은 요청에 없지만 클라이언트는 보통 자신이 누구를 보고 있는지 알고 있음.
        // 성능 최적화를 위해 매번 DB에서 유저 정보를 조회하는 것은 피함.
        // 여기서는 간단히 받은 데이터를 그대로 전달함.

        // Safe check for problemId
        Long problemId = (request.getProblemId() != null) ? request.getProblemId() : 0L;

        IdeResponse response = IdeResponse.builder()
                .senderId(userId)
                .senderName("Unknown") // 성능 최적화: 빈번한 업데이트 시 DB 조회 생략
                .problemId(problemId)
                .filename(request.getFilename())
                .code(request.getCode())
                .lang(request.getLang())
                .build();

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("IDE", response));
    }

    // 관찰 시작/종료 이벤트 (Watch Event)
    @MessageMapping("/ide/watch")
    public void handleWatch(@Payload com.peekle.domain.study.dto.ide.IdeWatchRequest request,
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
        // 토픽: topic/studies/rooms/{studyId}/ide/{targetId}/watchers
        // 대상 유저는 "나를 보고 있는 사람들" 목록을 구독함.

        String topic = String.format("topic/studies/rooms/%d/ide/%d/watchers", studyId, targetId);

        java.util.Set<String> watchers = redisIdeService.getWatchers(studyId, targetId);

        // Payload: { type: "WATCH_UPDATE", data: { count: 3, viewers: [1, 5, ...] } }
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("count", watchers.size());
        data.put("viewers", watchers);

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("WATCH_UPDATE", data));
    }
}
