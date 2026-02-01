package com.peekle.domain.game.service;

import com.peekle.domain.point.entity.PointLog;
import com.peekle.domain.point.enums.PointCategory;
import com.peekle.domain.point.repository.PointLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;
    private final PointLogRepository pointLogRepository;

    // 순위별 포인트 (1등~5등, 이후는 참가 보상)
    private static final int[] RANK_POINTS = { 100, 80, 60, 40, 20 };
    private static final int PARTICIPATION_POINTS = 10;

    /**
     * 게임 종료 후 결과 처리 (포인트 지급 및 로그 저장)
     * RedisGameService.finishGame()에서 호출됨
     */
    @Transactional
    public void processGameResult(Long gameId) {
        log.info("🏁 Processing game result for Game ID: {}", gameId);

        // 1. Redis에서 랭킹 조회 (높은 점수 순)
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, gameId);
        Set<ZSetOperations.TypedTuple<Object>> rankingSet = redisTemplate.opsForZSet()
                .reverseRangeWithScores(rankingKey, 0, -1);

        if (rankingSet == null || rankingSet.isEmpty()) {
            log.warn("⚠️ No ranking data found for Game ID: {}", gameId);
            return;
        }

        // 방 정보 조회 (메타데이터용)
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String mode = (String) redisTemplate.opsForHash().get(infoKey, "mode");
        String teamType = (String) redisTemplate.opsForHash().get(infoKey, "teamType"); // "INDIVIDUAL" or "TEAM"

        // 2. 순위에 따라 포인트 지급
        int rank = 0;
        for (ZSetOperations.TypedTuple<Object> entry : rankingSet) {
            String userIdStr = String.valueOf(entry.getValue());
            Long userId = Long.parseLong(userIdStr);
            Double score = entry.getScore();

            // 포인트 결정 (1~5등은 차등, 그 외는 참가 보상)
            int points = (rank < RANK_POINTS.length) ? RANK_POINTS[rank] : PARTICIPATION_POINTS;
            final int finalRank = rank; // Lambda에서 사용하기 위해 final 변수로 캡처

            // 유저 조회 및 포인트 업데이트
            userRepository.findById(userId).ifPresent(user -> {
                // 리그 포인트 증가
                user.addLeaguePoint(points);
                userRepository.save(user);

                // 포인트 로그 저장
                String description = String.format("게임 결과 보상 (Game ID: %d, 순위: %d)", gameId, finalRank + 1);
                String metadata = String.format(
                        "{\"rank\": %d, \"roomId\": \"%d\", \"title\": \"게임 결과 보상\", \"mode\": \"%s\", \"teamType\": \"%s\"}",
                        finalRank + 1, gameId, mode != null ? mode : "UNKNOWN",
                        teamType != null ? teamType : "UNKNOWN");

                PointLog pointLog = new PointLog(
                        user,
                        PointCategory.GAME,
                        points,
                        description,
                        metadata);
                pointLogRepository.save(pointLog);

                log.info("💰 User {} awarded {} points (Rank: {}, Score: {})",
                        userId, points, finalRank + 1, score);
            });

            rank++;
        }

        log.info("✅ Game result processed. {} players received rewards.", rank);
    }
}
