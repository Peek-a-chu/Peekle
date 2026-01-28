package com.peekle.domain.game.service;

import com.peekle.domain.game.dto.GameCreateRequest;
import com.peekle.domain.game.dto.GameRoomResponse;
import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisGameService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    private final RedissonClient redissonClient;

    /**
     * 게임 상태 변경 메서드
     * 분산 락(Redisson Lock)을 사용하여 상태 변경 시 동시성 문제를 방지합니다.
     * 예를 들어, 동시에 '게임 시작'과 '방 나가기' 등의 요청이 몰려도 순서대로 처리되도록 보장합니다.
     *
     * @param roomId     게임 방 ID
     * @param nextStatus 변경할 다음 상태
     */
    public void updateGameStatus(Long roomId, GameStatus nextStatus) {
        // 1. 락 키 생성: 방 단위로 잠금을 걸기 위해 키에 roomId를 포함합니다.
        String lockKey = String.format(RedisKeyConst.LOCK_GAME_STATUS, roomId);
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // 2. 락 획득 시도 (tryLock)
            // waitTime(2초): 락을 얻을 때까지 최대 2초간 대기합니다.
            // leaseTime(3초): 락을 얻은 후 3초가 지나면 자동으로 해제됩니다 (Deadlock 방지).
            if (!lock.tryLock(2, 3, TimeUnit.SECONDS)) {
                throw new IllegalStateException("현재 다른 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.");
            }

            // 3. 현재 상태 조회
            String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
            String currentStatusStr = (String) redisTemplate.opsForValue().get(statusKey);

            // 상태가 Redis에 없으면 방금 생성된 방으로 간주하고 WAITING(대기) 상태로 초기화
            GameStatus currentStatus = currentStatusStr == null ? GameStatus.WAITING
                    : GameStatus.valueOf(currentStatusStr);

            // 4. 상태 전이 유효성 검사 (State Machine 로직)
            // 예: 게임 중(PLAYING)인데 갑자기 대기(WAITING)로 갈 수 없음.
            validateStatusTransition(currentStatus, nextStatus);

            // 5. 상태 업데이트 (Redis에 저장)
            redisTemplate.opsForValue().set(statusKey, nextStatus.name());
            log.info("Game Room {} Status Changed: {} -> {}", roomId, currentStatus, nextStatus);

            // 6. 변경 사항 전파 (Pub/Sub)
            // 클라이언트(프론트엔드)는 이 토픽을 구독하고 있다가, 메시지가 오면 화면을 갱신합니다.
            String topic = String.format(RedisKeyConst.TOPIC_GAME_ROOM, roomId);
            redisPublisher.publish(new ChannelTopic(topic), SocketResponse.of("STATUS_CHANGE", nextStatus));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Lock interrupted", e);
        } finally {
            // 7. 락 해제
            // 반드시 finally 블록에서 해제해야 예외가 발생해도 락이 풀립니다.
            // isHeldByCurrentThread: 내가 건 락인지 확인하고 해제합니다.
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 상태 전이 검증 로직 (State Machine)
     * 허용되지 않는 상태 변경 흐름을 차단합니다.
     * 올바른 흐름: 대기 -> 카운트다운 -> 게임중 -> 종료
     */
    private void validateStatusTransition(GameStatus current, GameStatus next) {
        // 같은 상태로 변경 요청은 무시하고 통과시킴 (멱등성 보장)
        if (current == next)
            return;

        boolean isValid = switch (current) {
            // 대기(WAITING)에서는 -> 카운트다운(시작) 혹은 종료(방폭)만 가능
            case WAITING -> next == GameStatus.PLAYING || next == GameStatus.END;

            // 게임 중(PLAYING)에는 -> 오직 종료(END)만 가능
            case PLAYING -> next == GameStatus.END;

            // 이미 종료(END)된 게임은 -> 상태 변경 불가
            case END -> false;
        };

        if (!isValid) {
            throw new IllegalStateException(String.format("잘못된 상태 변경 요청입니다: %s -> %s", current, next));
        }
    }

    // 방 만들기
    public Long createGameRoom(GameCreateRequest request) {
        // 1. 방 ID 생성 (Atomic Increment)
        Long roomId = redisTemplate.opsForValue().increment(RedisKeyConst.GAME_ROOM_ID_SEQ);
        // 2. 방 정보 Hash에 저장
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<String, String> roomInfo = new HashMap<>();
        roomInfo.put("title", request.getTitle());
        roomInfo.put("maxPlayers", String.valueOf(request.getMaxPlayers()));
        roomInfo.put("timeLimit", String.valueOf(request.getTimeLimit()));
        roomInfo.put("problemCount", String.valueOf(request.getProblemCount()));
        roomInfo.put("mode", request.getMode().name()); // Enum -> String
        roomInfo.put("type", request.getType().name()); 
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            roomInfo.put("password", request.getPassword());
        }
        // 초기 상태 WAITING
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.GAME_STATUS, roomId), GameStatus.WAITING.name());
        redisTemplate.opsForHash().putAll(infoKey, roomInfo);
        // 3. 방 목록(Set)에 ID 추가 (검색용)
        redisTemplate.opsForSet().add(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));
        return roomId;
    }

    // 방 목록 조회
    public List<GameRoomResponse> getAllGameRooms() {
        // 1. 모든 방 ID 조회

        Set<Object> roomIds = redisTemplate.opsForSet().members(RedisKeyConst.GAME_ROOM_IDS);
        if (roomIds == null || roomIds.isEmpty())
            return Collections.emptyList();
        // 2. 각 방의 정보 조회 (Pipelining 권장하지만 여기선 심플하게 Loop)
        return roomIds.stream().map(id -> {
            Long roomId = Long.parseLong((String) id);
            String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
            Map<Object, Object> info = redisTemplate.opsForHash().entries(infoKey);
            String status = (String) redisTemplate.opsForValue().get(String.format(RedisKeyConst.GAME_STATUS, roomId));
            return GameRoomResponse.builder()
                    .roomId(roomId)
                    .title((String) info.get("title"))
                    .isSecret(info.containsKey("password"))
                    .status(status != null ? GameStatus.valueOf(status) : GameStatus.WAITING)
                    .maxPlayers(Integer.parseInt((String) info.getOrDefault("maxPlayers", "4")))
                    .problemCount(Integer.parseInt((String) info.getOrDefault("problemCount", "10")))
                    .mode(GameMode.valueOf((String) info.getOrDefault("mode", "INDIVIDUAL")))
                    .type(GameType.valueOf((String) info.getOrDefault("type", "TIME_ATTACK")))
                    .build();
        }).collect(Collectors.toList());
    }

    // 방 단건 조회 (초대 링크, 새로고침 용)
    public GameRoomResponse getGameRoom(Long roomId) {
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        Map<Object, Object> info = redisTemplate.opsForHash().entries(infoKey);

        // 방이 없으면 예외 처리
        if (info.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 방입니다. (Room ID: " + roomId + ")");
        }

        String status = (String) redisTemplate.opsForValue().get(String.format(RedisKeyConst.GAME_STATUS, roomId));

        return GameRoomResponse.builder()
                .roomId(roomId)
                .title((String) info.get("title"))
                .isSecret(info.containsKey("password"))
                .status(status != null ? GameStatus.valueOf(status) : GameStatus.WAITING)
                .maxPlayers(Integer.parseInt((String) info.getOrDefault("maxPlayers", "4")))
                .problemCount(Integer.parseInt((String) info.getOrDefault("problemCount", "10")))
                .mode(GameMode.valueOf((String) info.getOrDefault("mode", "INDIVIDUAL")))
                .type(GameType.valueOf((String) info.getOrDefault("type", "TIME_ATTACK")))
                .build();
    }
}