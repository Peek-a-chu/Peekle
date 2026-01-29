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
        int totalEarnedPoints = 0;

        // 1. 문제 풀이 기본 점수 (최초 1회)
        long successCount = submissionLogRepository.countByUserIdAndProblemId(user.getId(), problem.getId());
        
        if (successCount == 1) {
            int problemPoints = calculateProblemPoint(problem.getTier());
            user.addLeaguePoint(problemPoints);
            totalEarnedPoints += problemPoints;

            // POINT_LOG 기록
            String desc = String.format("%s (%s)", problem.getTitle(), problem.getTier());
            pointLogRepository.save(new PointLog(user, PointCategory.PROBLEM, problemPoints, desc));
            
            // Streak Logic (기존 유지)
            updateStreak(user);
        }

        if (totalEarnedPoints > 0) {
            userRepository.save(user);
            System.out.println("🏆 League Point Updated! User: " + user.getNickname() + ", Points: +" + totalEarnedPoints);
        }
        
        return totalEarnedPoints;
    }

    private void updateStreak(User user) {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate yesterday = today.minusDays(1);
        
        boolean alreadySolvedToday = user.getLastSolvedDate() != null && user.getLastSolvedDate().equals(today);
        
        if (!alreadySolvedToday) {
             boolean continuesStreak = user.getLastSolvedDate() != null && user.getLastSolvedDate().equals(yesterday);
             user.updateStreak(continuesStreak);
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

    @Transactional(readOnly = true)
    public com.peekle.domain.league.dto.WeeklyPointSummaryResponse getWeeklyPointSummary(User user, java.time.LocalDate date) {
        // Use provided date or default to now
        java.time.ZonedDateTime referenceTime;
        if (date != null) {
            // If date is provided, use it at current time (or end of day? let's stick to preserving time or just noon)
            // Ideally, we just need a point in time to find the containing "Week"
            
            // Note: We need to be careful. The week starts on Wednesday 06:00. 
            // If user selects Wednesday, does it calculate from that Wednesday 6am?
            // Let's assume the date provided is in KST context.
            referenceTime = date.atStartOfDay(java.time.ZoneId.of("Asia/Seoul")).plusHours(12); // Noon on that day to be safe
        } else {
            referenceTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        }
        
        // Find the start of the current week (Wednesday 06:00 KST)
        java.time.ZonedDateTime startOfWeek = referenceTime.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.WEDNESDAY))
                .withHour(6).withMinute(0).withSecond(0).withNano(0);
        
        // If reference time is before Wednesday 06:00, the week started last Wednesday
        if (referenceTime.isBefore(startOfWeek)) {
            startOfWeek = startOfWeek.minusWeeks(1);
        }
        
        java.time.ZonedDateTime endOfWeek = startOfWeek.plusWeeks(1);
        
        // Convert to LocalDateTime for DB query
        java.time.LocalDateTime start = startOfWeek.toLocalDateTime();
        java.time.LocalDateTime end = endOfWeek.toLocalDateTime();
        
        List<PointLog> logs = pointLogRepository.findAllByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                user.getId(), start, end
        );
        
        int totalScore = logs.stream()
                .mapToInt(PointLog::getAmount)
                .sum();
        
        List<com.peekle.domain.league.dto.PointActivityDto> activities = logs.stream()
                .map(log -> com.peekle.domain.league.dto.PointActivityDto.builder()
                        .description(log.getDescription())
                        .amount(log.getAmount())
                        .createdAt(log.getCreatedAt())
                        .category(log.getCategory())
                        .build())
                .collect(java.util.stream.Collectors.toList());
                
        return com.peekle.domain.league.dto.WeeklyPointSummaryResponse.builder()
                .totalScore(totalScore)
                .startDate(start)
                .endDate(end)
                .activities(activities)
                .build();
    }

    private int calculateProblemPoint(String tier) {
        return com.peekle.global.util.SolvedAcLevelUtil.getPointFromTier(tier);
    }
    
    private final com.peekle.domain.league.repository.LeagueHistoryRepository leagueHistoryRepository;

    @Transactional(readOnly = true)
    public List<com.peekle.domain.league.dto.LeagueProgressResponse> getLeagueProgress(User user) {
        List<com.peekle.domain.league.dto.LeagueProgressResponse> progressList = new ArrayList<>();
        
        // 1. Fetch History
        List<com.peekle.domain.league.entity.LeagueHistory> histories = leagueHistoryRepository.findAllByUserIdOrderBySeasonWeekAsc(user.getId());
        
        for (com.peekle.domain.league.entity.LeagueHistory h : histories) {
            // closedAt is the END of the week (Wednesday 06:00)
            // Start date would be 7 days before closedAt
            java.time.LocalDate end = h.getClosedAt().toLocalDate();
            java.time.LocalDate start = end.minusDays(7);
            
            progressList.add(com.peekle.domain.league.dto.LeagueProgressResponse.builder()
                    .league(h.getLeague().name().toLowerCase())
                    .score(h.getFinalPoint())
                    .date(start)
                    .periodEnd(end)
                    .leagueIndex(h.getLeague().ordinal())
                    .build());
        }
        
        // 2. Append Current Status
        // Current week calculation
        java.time.ZonedDateTime nowKst = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        java.time.ZonedDateTime startOfWeek = nowKst.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.WEDNESDAY))
                .withHour(6).withMinute(0).withSecond(0).withNano(0);
        if (nowKst.isBefore(startOfWeek)) {
            startOfWeek = startOfWeek.minusWeeks(1);
        }
        java.time.ZonedDateTime endOfWeek = startOfWeek.plusWeeks(1);
        
        progressList.add(com.peekle.domain.league.dto.LeagueProgressResponse.builder()
                .league(user.getLeague().name().toLowerCase())
                .score(user.getLeaguePoint())
                .date(startOfWeek.toLocalDate())
                .periodEnd(endOfWeek.toLocalDate())
                .leagueIndex(user.getLeague().ordinal())
                .build());
                
        return progressList;
    }
}
