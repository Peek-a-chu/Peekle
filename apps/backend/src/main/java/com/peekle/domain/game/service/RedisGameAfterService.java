package com.peekle.domain.game.service;

import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameAfterService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 유저를 게임 온라인 목록에 추가
     */
    public void addOnlineUser(Long gameId, Long userId) {
        String onlineKey = String.format(RedisKeyConst.GAME_ROOM_ONLINE, gameId);
        redisTemplate.opsForSet().add(onlineKey, userId);
    }

    /**
     * 유저를 게임 온라인 목록에서 제거
     */
    public void removeOnlineUser(Long gameId, Long userId) {
        String onlineKey = String.format(RedisKeyConst.GAME_ROOM_ONLINE, gameId);
        redisTemplate.opsForSet().remove(onlineKey, userId);
    }

    /**
     * 현재 방에 참여 중인(소켓 연결된) 유저 ID 목록을 반환
     */
    public Set<Long> getOnlineUserIds(Long roomId) {
        String onlineKey = String.format(RedisKeyConst.GAME_ROOM_ONLINE, roomId);
        Set<Object> members = redisTemplate.opsForSet().members(onlineKey);

        if (members == null || members.isEmpty()) {
            return Set.of();
        }

        return members.stream()
                .map(id -> Long.parseLong(String.valueOf(id)))
                .collect(Collectors.toSet());
    }

    /**
     * 온라인 유저 목록을 해당 방의 모든 클라이언트에게 브로드캐스트
     */
    public void broadcastOnlineUsers(Long roomId) {
        try {
            Set<Long> onlineUserIds = getOnlineUserIds(roomId);

            // 본인 포함 모든 구독자에게 전송
            messagingTemplate.convertAndSend(
                    "/topic/games/" + roomId + "/connected-users",
                    onlineUserIds);
            log.info("📡 Broadcasted online users for Room {}: {} users", roomId, onlineUserIds.size());
        } catch (Exception e) {
            log.error("Failed to broadcast online users for room {}", roomId, e);
        }
    }
}
