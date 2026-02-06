package com.peekle.domain.game.scheduler;

import com.peekle.domain.game.service.RedisGameService;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class GameScheduler {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisGameService redisGameService;

    /**
     * 1분마다 실행되어 시간 제한이 지난 게임을 종료 처리
     * - TIME_ATTACK: 설정된 timeLimit 경과 시 종료
     * - SPEED_RACE: 240분(4시간) 경과 시 강제 종료 (무한 대기 방지)
     */
    @Scheduled(fixedRate = 5000) // [TEST] Check every 5 seconds
    public void checkGameTimeLimit() {
        // 1. 활성화된 모든 방 조회
        Set<Object> activeRoomIds = redisTemplate.opsForSet().members(RedisKeyConst.GAME_ROOM_IDS);
        if (activeRoomIds == null || activeRoomIds.isEmpty()) {
            return;
        }

        long count = 0;
        long now = System.currentTimeMillis();

        for (Object roomIdObj : activeRoomIds) {
            String roomIdStr = String.valueOf(roomIdObj);
            try {
                Long roomId = Long.parseLong(roomIdStr);

                // 2. 상태 조회 (PLAYING 인 경우만 체크)
                String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
                String status = (String) redisTemplate.opsForValue().get(statusKey);

                if (!"PLAYING".equals(status)) {
                    continue;
                }

                // 3. 시작 시간 조회
                String startTimeKey = String.format(RedisKeyConst.GAME_START_TIME, roomId);
                String startTimeStr = (String) redisTemplate.opsForValue().get(startTimeKey);
                if (startTimeStr == null) {
                    continue;
                }
                long startTime = Long.parseLong(startTimeStr);

                // 4. 경과 시간 계산 (초 단위) [TEST] Changed to Seconds
                long elapsedSeconds = (now - startTime) / 1000;

                // 5. 방 설정 정보 조회 (Time Limit, Mode)
                String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
                Map<Object, Object> roomInfo = redisTemplate.opsForHash().entries(infoKey);

                String mode = (String) roomInfo.get("mode");
                String timeLimitStr = (String) roomInfo.get("timeLimit");

                // [TEST] timeLimit is now treated as seconds (Default 40s)
                int timeLimit = (timeLimitStr != null) ? Integer.parseInt(timeLimitStr) : 40;

                // 6. 종료 조건 체크
                boolean shouldEnd = false;

                if ("TIME_ATTACK".equals(mode)) {
                    // 타임어택: 설정 시간이 지나면 종료 (Seconds)
                    // [TEST] Add 5 seconds buffer for frontend countdown (4.8s approx)
                    if (elapsedSeconds >= timeLimit + 5) {
                        log.info("⏳ Time Attack Limit Reached (with buffer): Game {}, Elapsed: {}s, Limit: {}s",
                                roomId, elapsedSeconds, timeLimit);
                        redisGameService.finishGame(roomId); // Use roomId directly
                        count++; // Increment count here as finishGame is called directly
                    }
                } else if ("SPEED_RACE".equals(mode)) {
                    // 스피드 레이스: 4시간(240분) 지나면 강제 종료 (Converted to seconds)
                    if (elapsedSeconds >= 240 * 60) {
                        shouldEnd = true;
                        log.info("🛑 Speed Race Game {} expired (Limit: 240m, Elapsed: {}s)", roomId, elapsedSeconds);
                    }
                }

                if (shouldEnd) {
                    redisGameService.finishGame(roomId);
                    count++;
                }

            } catch (Exception e) {
                log.error("Error checking time limit for room {}", roomIdStr, e);
            }
        }

        if (count > 0) {
            log.info("Finished {} expired games.", count);
        }
    }
}
