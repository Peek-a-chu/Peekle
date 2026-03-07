package com.peekle.domain.game.service;

import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 게임 방 관리를 위한 공통 유틸리티 서비스
 * - 방 삭제
 * - 태그 번역
 * - 기타 공통 기능
 * 
 * 순환 의존성을 방지하기 위해 다른 서비스들이 공통으로 사용하는 메서드를 모아둠
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameRoomManager {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final TagRepository tagRepository;

    /**
     * 방 삭제 (Clean Up)
     * 참여자가 없으면 호출
     */
    public void deleteGameRoom(Long roomId) {
        // 0. 로비 브로드캐스트: 방 삭제 알림 (삭제 전에 전송)
        Map<String, Object> lobbyDeleteData = new HashMap<>();
        lobbyDeleteData.put("roomId", roomId);
        redisPublisher.publish(
                new ChannelTopic(RedisKeyConst.TOPIC_GAME_LOBBY),
                SocketResponse.of("LOBBY_ROOM_DELETED", lobbyDeleteData));
        log.info("📢 [Lobby] Game Room {} Deleted - Broadcasting to lobby", roomId);

        // 1. Redis 데이터 삭제
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);

        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INFO, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_STATUS, roomId));
        redisTemplate.delete(playersKey); // Players Set
        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId)); // Ready Hash
        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_TEAMS, roomId)); // Teams Hash
        redisTemplate.opsForSet().remove(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));

        // 게임 진행 중 생성된 키들 삭제
        redisTemplate.delete(String.format(RedisKeyConst.GAME_START_TIME, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_RANKING, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_TEAM_RANKING, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_PROBLEMS, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_PROBLEMS_PREVIEW, roomId));

        // 초대 코드 삭제
        String inviteCode = (String) redisTemplate.opsForValue()
                .get(String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId));
        if (inviteCode != null) {
            redisTemplate.delete(String.format(RedisKeyConst.GAME_INVITE_CODE, inviteCode));
            redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_INVITE_CODE, roomId));
        }

        // 종료 타이머 키 삭제
        redisTemplate.delete(String.format(RedisKeyConst.GAME_FINISH_TIMER, roomId));
        redisTemplate.delete(String.format(RedisKeyConst.GAME_ROOM_BROADCASTED, roomId));

        log.info("🗑️ Game Room {} Deleted and Resources Cleaned up.", roomId);
    }

    /**
     * 태그 키를 한국어 이름으로 변환
     */
    public List<String> translateTagsToKo(List<String> tagKeys) {
        if (tagKeys == null || tagKeys.isEmpty())
            return Collections.emptyList();

        return tagKeys.stream()
                .map(key -> tagRepository.findByKey(key.trim().toLowerCase())
                        .map(com.peekle.domain.problem.entity.Tag::getName)
                        .orElse(key))
                .collect(Collectors.toList());
    }
}
