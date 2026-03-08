package com.peekle.domain.game.service;

import com.peekle.domain.point.entity.PointLog;
import com.peekle.domain.point.enums.PointCategory;
import com.peekle.domain.point.repository.PointLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.redis.RedisKeyConst;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GameService {

    private static final String METRIC_GAME_FINISH_POINT_LOG_WRITTEN = "game.finish.point_log_written";

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;
    private final PointLogRepository pointLogRepository;
    private final MeterRegistry meterRegistry;

    /**
     * 게임 종료 후 결과 처리 (포인트 지급 및 로그 저장)
     * RedisGameService.finishGame()에서 호출됨
     *
     * @param gameId   게임 ID
     * @param winner   승자 정보 (개인전: UserId, 팀전: TeamColor)
     * @param teamType 게임 타입 (INDIVIDUAL / TEAM)
     * @return 각 유저별 획득 경험치 (UserId -> Exp)
     */
    @Transactional
    public Map<Long, Integer> processGameResult(Long gameId, String winner, String teamType) {
        return processGameResult(gameId, winner, teamType, "manual");
    }

    @Transactional
    public Map<Long, Integer> processGameResult(Long gameId, String winner, String teamType, String trigger) {
        log.info("🏁 Processing game result for Game ID: {}", gameId);

        // 1. Redis에서 랭킹 조회 (높은 점수 순)
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, gameId);
        Set<ZSetOperations.TypedTuple<Object>> rankingSet = redisTemplate.opsForZSet()
                .reverseRangeWithScores(rankingKey, 0, -1);

        if (rankingSet == null || rankingSet.isEmpty()) {
            log.warn("⚠️ No ranking data found for Game ID: {}", gameId);
            return Collections.emptyMap();
        }

        // 방 정보 조회 (메타데이터용)
        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, gameId);
        String mode = (String) redisTemplate.opsForHash().get(infoKey, "mode");
        String roomTitle = (String) redisTemplate.opsForHash().get(infoKey, "title");

        Map<Long, Integer> gainedPointsMap = new HashMap<>();
        int totalPlayers = rankingSet.size();

        // 팀전 로직을 위한 준비
        int[] scorePool = new int[totalPlayers];
        for (int i = 0; i < totalPlayers; i++) {
            scorePool[i] = (totalPlayers - i) * 10; // 1등부터 N*10, (N-1)*10 ...
        }

        // 각 유저별 기본 정보 매핑 (UserId -> RankIndex)
        List<Long> rankedUserIds = new ArrayList<>();
        for (ZSetOperations.TypedTuple<Object> entry : rankingSet) {
            rankedUserIds.add(Long.parseLong(String.valueOf(entry.getValue())));
        }

        int winTeamTotalScore = 0;
        int loseTeamTotalScore = 0;
        int winTeamCount = 0;
        int loseTeamCount = 0;

        // 팀전일 경우 승리팀/패배팀 점수 Pool 계산
        if ("TEAM".equals(teamType) && winner != null) {
            // Redis에서 팀 정보 가져오기
            String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, gameId);
            Map<Object, Object> teamMap = redisTemplate.opsForHash().entries(teamsKey);

            for (Object obj : teamMap.values()) {
                if (winner.equals(obj))
                    winTeamCount++;
                else
                    loseTeamCount++;
            }

            // 점수 풀 분배 (상위 N명 점수 -> 승리팀, 하위 M명 점수 -> 패배팀)
            int currentIndex = 0;
            for (int i = 0; i < winTeamCount; i++) {
                if (currentIndex < totalPlayers)
                    winTeamTotalScore += scorePool[currentIndex++];
            }
            for (int i = 0; i < loseTeamCount; i++) {
                if (currentIndex < totalPlayers)
                    loseTeamTotalScore += scorePool[currentIndex++];
            }
        }

        int rank = 0;
        for (Long userId : rankedUserIds) {
            int points = 0;

            if ("TEAM".equals(teamType) && winner != null) {
                // 팀전 포인트 계산
                String teamsKey = String.format(RedisKeyConst.GAME_ROOM_TEAMS, gameId);
                String userTeam = (String) redisTemplate.opsForHash().get(teamsKey, String.valueOf(userId));

                if (winner.equals(userTeam)) {
                    points = winTeamCount > 0 ? winTeamTotalScore / winTeamCount : 0;
                } else {
                    points = loseTeamCount > 0 ? loseTeamTotalScore / loseTeamCount : 0;
                }
            } else {
                // 개인전 포인트 계산 (순위별 차등)
                points = (rank < totalPlayers) ? scorePool[rank] : 10;
            }

            // 포인트가 0보다 작으면 최소 10점 (참가상) 보장 로직이 필요하다면 추가
            if (points < 10)
                points = 10;

            final int gainedPoints = points;
            final int finalRank = rank;

            gainedPointsMap.put(userId, gainedPoints);

            // 유저 조회 및 포인트 업데이트
            userRepository.findById(userId).ifPresent(user -> {
                // 리그 포인트 증가
                user.addLeaguePoint(gainedPoints);
                // 승급/강등 로직은 별도로 처리하거나 User 엔티티 메서드 활용
                // 여기선 단순 포인트 증가만

                userRepository.save(user);

                // 포인트 로그 저장
                String displayTitle = roomTitle != null ? roomTitle : String.valueOf(gameId);
                String description = String.format("게임 결과 보상 (방: %s, 순위: %d)", displayTitle, finalRank + 1);
                String metadata = String.format(
                        "{\"rank\": %d, \"roomId\": \"%d\", \"roomTitle\": \"%s\", \"title\": \"게임 결과 보상\", \"mode\": \"%s\", \"teamType\": \"%s\"}",
                        finalRank + 1, gameId, displayTitle.replace("\"", "\\\""), mode != null ? mode : "UNKNOWN",
                        teamType != null ? teamType : "UNKNOWN");

                PointLog pointLog = new PointLog(
                        user,
                        PointCategory.GAME,
                        gainedPoints,
                        description,
                        metadata);
                pointLogRepository.save(pointLog);
                meterRegistry.counter(METRIC_GAME_FINISH_POINT_LOG_WRITTEN, "trigger", trigger).increment();

                log.info("💰 User {} awarded {} points (Rank: {})", userId, gainedPoints, finalRank + 1);
            });

            rank++;
        }

        log.info("✅ Game result processed. {} players received rewards.", rank);
        return gainedPointsMap;
    }
}
