package com.peekle.domain.game.socket;

import com.peekle.domain.game.service.RedisGameService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GameWebSocketListener {

    private final RedisGameService gameService;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();

        if (attributes == null) {
            return;
        }

        Object userIdObj = attributes.get("userId");
        Object gameIdObj = attributes.get("gameId");

        if (userIdObj != null) {
            Long userId = Long.parseLong(String.valueOf(userIdObj));

            // [Modified] 세션에 gameId가 없으면 Redis에서 조회 (비정상 종료 대비)
            if (gameIdObj == null) {
                gameIdObj = gameService.getUserCurrentGameId(userId);
                if (gameIdObj != null) {
                    log.info("[Game] Found missing gameId {} for user {} from Redis", gameIdObj, userId);
                }
            }

            if (gameIdObj != null) {
                Long gameId = Long.parseLong(String.valueOf(gameIdObj));

                log.info("[Game] User disconnected from game. Game ID: {}, User ID: {}", gameId, userId);

                try {
                    // 게임 방 퇴장 처리 (자동 위임, 빈 방 삭제 등 포함)
                    // [Modified] 단순 퇴장이 아니라 상태에 따라 처리 (재접속 지원)
                    gameService.handleDisconnect(gameId, userId);
                } catch (Exception e) {
                    log.error("[Game] Error during disconnect cleanup", e);
                }
            }
        }
    }
}
