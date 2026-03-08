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
        String language = (request.getLang() != null && !request.getLang().isBlank())
                ? request.getLang()
                : request.getLanguage();
        Long eventTs = request.getEventTs() != null ? request.getEventTs() : System.currentTimeMillis();

        IdeResponse response = IdeResponse.builder()
                .senderId(userId)
                .senderName("Unknown")
                .problemId(problemId)
                .problemTitle(request.getProblemTitle())
                .externalId(request.getExternalId())
                .filename(request.getFilename())
                .code(request.getCode())
                .lang((language != null && !language.isBlank()) ? language : "text")
                .eventTs(eventTs)
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
            Long requestedProblemId = null;
            Object rawProblemId = payload.get("problemId");
            if (rawProblemId != null) {
                try {
                    requestedProblemId = Long.valueOf(rawProblemId.toString());
                } catch (NumberFormatException ignored) {
                    requestedProblemId = null;
                }
            }

            IdeResponse activeSnapshot = redisIdeService.getActiveIdeSnapshot(studyId, targetUserId);
            Long activeProblemId = (activeSnapshot != null) ? activeSnapshot.getProblemId() : null;
            Long resolvedProblemId = (activeProblemId != null && activeProblemId > 0)
                    ? activeProblemId
                    : (requestedProblemId != null && requestedProblemId > 0 ? requestedProblemId : null);
            if (resolvedProblemId == null) {
                return;
            }

            // Redis fetch: prefer unified active IDE snapshot, then fallback to per-problem hash.
            IdeResponse snapshot = activeSnapshot;
            if (snapshot == null || snapshot.getProblemId() == null || !snapshot.getProblemId().equals(resolvedProblemId)) {
                snapshot = redisIdeService.getCode(studyId, resolvedProblemId, targetUserId);
            }
            if (snapshot == null && requestedProblemId != null && requestedProblemId > 0
                    && !requestedProblemId.equals(resolvedProblemId)) {
                snapshot = redisIdeService.getCode(studyId, requestedProblemId, targetUserId);
            }

            if (snapshot != null) {
                // Topic: topic/studies/rooms/{studyId}/ide/{requesterId}/snapshot
                String responseTopic = String.format("topic/studies/rooms/%d/ide/%d/snapshot", studyId, requesterId);
                redisPublisher.publish(new ChannelTopic(responseTopic), SocketResponse.of("IDE_SNAPSHOT", snapshot));
            }
        } catch (Exception e) {
            log.error("Snapshot Request Error", e);
        }
    }

    @MessageMapping("/ide/language")
    public void updateIdeLanguage(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = (Long) headerAccessor.getSessionAttributes().get("userId");
        Long studyId = (Long) headerAccessor.getSessionAttributes().get("studyId");

        if (userId == null || studyId == null) {
            return;
        }

        Long problemId = 0L;
        Object rawProblemId = payload.get("problemId");
        if (rawProblemId != null) {
            try {
                problemId = Long.valueOf(rawProblemId.toString());
            } catch (NumberFormatException ignored) {
                problemId = 0L;
            }
        }

        String problemTitle = null;
        Object rawProblemTitle = payload.get("problemTitle");
        if (rawProblemTitle != null) {
            problemTitle = rawProblemTitle.toString().trim();
            if (problemTitle.isBlank()) {
                problemTitle = null;
            }
        }
        String externalId = null;
        Object rawExternalId = payload.get("externalId");
        if (rawExternalId != null) {
            externalId = rawExternalId.toString().trim();
            if (externalId.isBlank()) {
                externalId = null;
            }
        }

        String lang = null;
        Object rawLang = payload.get("lang");
        if (rawLang != null) {
            lang = rawLang.toString().trim();
        }
        if (lang == null || lang.isBlank()) {
            Object rawLanguage = payload.get("language");
            if (rawLanguage != null) {
                lang = rawLanguage.toString().trim();
            }
        }

        Long eventTs = null;
        Object rawEventTs = payload.get("eventTs");
        if (rawEventTs != null) {
            try {
                eventTs = Long.valueOf(rawEventTs.toString());
            } catch (NumberFormatException ignored) {
                eventTs = null;
            }
        }
        if (eventTs == null) {
            eventTs = System.currentTimeMillis();
        }

        String normalizedLang = redisIdeService.normalizeLanguage(lang);
        boolean hasCodePayload = payload.containsKey("code");
        Object rawCode = payload.get("code");
        String templateCode = hasCodePayload
                ? (rawCode != null ? rawCode.toString() : "")
                : redisIdeService.getTemplateCode(normalizedLang);
        String filename = redisIdeService.getDefaultFilename(normalizedLang);
        redisIdeService.saveCode(
                studyId,
                userId,
                problemId,
                problemTitle,
                externalId,
                filename,
                templateCode,
                normalizedLang,
                eventTs);

        String topic = String.format(RedisKeyConst.TOPIC_IDE, studyId, userId);
        IdeResponse response = IdeResponse.builder()
                .senderId(userId)
                .senderName("Unknown")
                .problemId(problemId)
                .problemTitle(problemTitle)
                .externalId(externalId)
                .filename(filename)
                .code(templateCode)
                .lang(normalizedLang)
                .eventTs(eventTs)
                .build();

        redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("IDE", response));
    }
}
