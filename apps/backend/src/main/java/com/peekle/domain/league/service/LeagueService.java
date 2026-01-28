package com.peekle.domain.league.service;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.point.entity.PointLog;
import com.peekle.domain.point.enums.PointCategory;
import com.peekle.domain.point.repository.PointLogRepository;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.league.dto.LeagueRankingMemberDto;
import com.peekle.domain.league.dto.LeagueStatDto;
import com.peekle.domain.league.dto.LeagueStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.EnumMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class LeagueService {

    private final PointLogRepository pointLogRepository;
    private final SubmissionLogRepository submissionLogRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    /**
     * 문제 해결 시 리그 포인트 업데이트
     * - 중복 해결 여부를 체크하고, 최초 해결 시 포인트 지급
     */
    public int updateLeaguePointForSolvedProblem(User user, Problem problem) {
        // 이미 해결한 기록이 1개(방금 저장한 것)뿐인지 확인 = 최초 해결
        long successCount = submissionLogRepository.countByUserIdAndProblemId(
                user.getId(), problem.getId()
        );

        // 로직 개선: successCount가 1일 때만 주는데, 간혹 동시성이 있을 수 있음.
        // 하지만 여기선 간단히 1이면 최초라고 가정. (원래는 exists check를 먼저 하고 save했어야 함)
        
        if (successCount == 1) {
            int pointAmount = calculateProblemPoint(problem.getTier());
            
            user.addLeaguePoint(pointAmount);
            userRepository.save(user);

            String description = String.format("Solved problem: %s (%s)", problem.getTitle(), problem.getTier());
            PointLog pointLog = new PointLog(user, PointCategory.PROBLEM, pointAmount, description);
            pointLogRepository.save(pointLog);

            System.out.println("🏆 League Point Updated! User: " + user.getNickname() + ", Points: +" + pointAmount);
            return pointAmount;
        } else {
            System.out.println("⚠️ Already solved. No league points awarded.");
            return 0; // 포인트 없음
        }
    }

    public int getUserRank(User user) {
        if (user.getLeagueGroupId() != null) {
            return (int) userRepository.countByLeagueGroupIdAndLeaguePointGreaterThan(
                    user.getLeagueGroupId(), user.getLeaguePoint()
            ) + 1;
        } else {
            return (int) userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;
        }
    }

    @Transactional(readOnly = true)
    public LeagueStatusResponse getMyLeagueStatus(User user) {
        int myRank = getUserRank(user);
        int myLeagueMembers = getLeagueUserCount(user.getLeague());
        
        long totalServerUsers = 0;
        Map<LeagueTier, Integer> tierCounts = new EnumMap<>(LeagueTier.class);
        
        // 1. 전체 유저 수 및 티어별 카운트 조회
        for (LeagueTier tier : LeagueTier.values()) {
            int count = getLeagueUserCount(tier);
            tierCounts.put(tier, count);
            totalServerUsers += count;
        }
        
        // 2. 각 티어별 상위 % 계산 (Dto 리스트 생성)
        List<LeagueStatDto> leagueStats = new ArrayList<>();
        long currentUsersAbove = 0;
        
        // 높은 티어부터 순회 (RUBY -> STONE)
        for (int i = LeagueTier.values().length - 1; i >= 0; i--) {
            LeagueTier tier = LeagueTier.values()[i];
            int count = tierCounts.get(tier);
            
            double percentile = totalServerUsers > 0 
                    ? ((double) currentUsersAbove / totalServerUsers) * 100 
                    : 0.0;
            
            leagueStats.add(LeagueStatDto.builder()
                    .tier(tier.name().toLowerCase())
                    .count(count)
                    .percentile(percentile)
                    .build());
                    
            currentUsersAbove += count; // 다음(낮은) 티어를 위해 누적
        }
        
        // 3. 내 백분위 계산
        long myUsersAbove = 0;
        for (LeagueTier tier : LeagueTier.values()) {
            if (tier.ordinal() > user.getLeague().ordinal()) {
                myUsersAbove += tierCounts.get(tier);
            }
        }
        
        double myPercentile = totalServerUsers > 0 
                ? ((double) (myUsersAbove + myRank) / totalServerUsers) * 100 
                : 0.0;
                
        // 4. 같은 그룹 내 랭킹 조회
        List<User> groupUsers;
        int totalGroupMembers = 0;

        if (user.getLeagueGroupId() != null) {
            // 리그 그룹이 배정된 경우 해당 그룹 내 랭킹 조회
            groupUsers = userRepository.findTop100ByLeagueGroupIdOrderByLeaguePointDesc(user.getLeagueGroupId());
            totalGroupMembers = userRepository.countByLeagueGroupId(user.getLeagueGroupId());
        } else {
            // 그룹이 없는 경우(배치고사 전 등) 임시로 같은 티어 전체 조회 (Top 10)
            groupUsers = userRepository.findTop100ByLeagueOrderByLeaguePointDesc(user.getLeague());
            totalGroupMembers = (int) userRepository.countByLeague(user.getLeague());
        }
        
        // 승급/강등 인원 계산
        LeagueTier currentTier = user.getLeague();
        int promoteCount = 0;
        int demoteCount = 0;
        
        if (totalGroupMembers > 1) { // 1명 이하는 변동 없음
             // 승급 = min( ceil(N * P), N - 1 )
            promoteCount = (int) Math.ceil(totalGroupMembers * (currentTier.getPromotePercent() / 100.0));
            promoteCount = Math.min(promoteCount, totalGroupMembers - 1);

            // 강등 = min( ceil(N * D), N - 승급 - 1 )
            demoteCount = (int) Math.ceil(totalGroupMembers * (currentTier.getDemotePercent() / 100.0));
            demoteCount = Math.min(demoteCount, totalGroupMembers - promoteCount - 1);
        }

        List<LeagueRankingMemberDto> members = new ArrayList<>();
        int currentRank = 1;
        for (User u : groupUsers) {
            com.peekle.domain.league.enums.LeagueStatus status = com.peekle.domain.league.enums.LeagueStatus.STAY;
            
            if (currentRank <= promoteCount) {
                status = com.peekle.domain.league.enums.LeagueStatus.PROMOTE;
            } else if (currentRank > (totalGroupMembers - demoteCount)) {
                status = com.peekle.domain.league.enums.LeagueStatus.DEMOTE;
            }

            members.add(LeagueRankingMemberDto.builder()
                    .rank(currentRank++)
                    .name(u.getNickname())
                    .avatar(u.getProfileImg() != null ? u.getProfileImg() : "/avatars/default.png") // Avatar fallback
                    .profileImgThumb(u.getProfileImgThumb())
                    .score(u.getLeaguePoint())
                    .me(u.getId().equals(user.getId()))
                    .status(status)
                    .build());
        }

        return LeagueStatusResponse.from(
                user.getLeague(),
                myRank,
                user.getLeaguePoint(),
                user.getMaxLeague(),
                myLeagueMembers,
                myPercentile,
                leagueStats,
                members
        );
    }
    
    private int getLeagueUserCount(LeagueTier tier) {
        String redisKey = "league:count:" + tier.name();
        String cachedCount = redisTemplate.opsForValue().get(redisKey);

        if (cachedCount != null) {
            return Integer.parseInt(cachedCount);
        } else {
            int count = (int) userRepository.countByLeague(tier);
            redisTemplate.opsForValue().set(redisKey, String.valueOf(count), Duration.ofMinutes(10));
            return count;
        }
    }

    private int calculateProblemPoint(String tier) {
        return com.peekle.global.util.SolvedAcLevelUtil.getPointFromTier(tier);
    }
}
