package com.peekle.domain.league.service;

import com.peekle.domain.league.dto.*;
import com.peekle.domain.league.entity.LeagueGroup;
import com.peekle.domain.league.entity.LeagueHistory;
import com.peekle.domain.league.enums.LeagueStatus;
import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.point.entity.PointLog;
import com.peekle.domain.point.enums.PointCategory;
import com.peekle.domain.point.repository.PointLogRepository;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.util.SolvedAcLevelUtil;
import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.EnumMap;
import java.util.stream.Collectors;

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
    private final com.peekle.domain.league.repository.LeagueGroupRepository leagueGroupRepository;
    private final com.peekle.domain.league.repository.LeagueHistoryRepository leagueHistoryRepository;
    private final org.redisson.api.RedissonClient redissonClient;

    /**
     * 신규 유저 리그 배치 (Redisson Lock)
     */
    public void assignInitialLeague(User user) {
        // 이미 그룹이 있다면 스킵
        if (user.getLeagueGroupId() != null) {
            return;
        }

        RLock lock = redissonClient.getLock("league:assignment:lock");
        try {
            // Wait 5s, Lease 3s (짧게 치고 빠지기)
            if (lock.tryLock(5, 3, java.util.concurrent.TimeUnit.SECONDS)) {
                try {
                    // 1. 현재 주차 계산
                    int currentSeasonWeek = calculateCurrentSeasonWeek();

                    // 2. STONE 티어의 가장 최근 그룹 조회
                    LeagueGroup group = leagueGroupRepository
                            .findTopByTierAndSeasonWeekOrderByIdDesc(LeagueTier.STONE, currentSeasonWeek)
                            .orElse(null);

                    // 3. 그룹이 없거나 꽉 찼으면 새로 생성
                    if (group == null || isGroupFull(group.getId())) {
                        group = createNewGroup(LeagueTier.STONE, currentSeasonWeek);
                    }

                    // 4. 유저에게 그룹 할당 및 저장
                    user.updateLeagueGroup(group.getId());
                    userRepository.save(user); // 트랜잭션 내 변경 감지 or 명시적 저장

                    // (옵션) Redis 랭킹 0점으로 초기화
                    // redisTemplate.opsForZSet().add("league:" + currentSeasonWeek + ":" +
                    // group.getId() + ":rank", user.getId().toString(), 0);

                } finally {
                    lock.unlock();
                }
            } else {
                throw new BusinessException(
                        ErrorCode.INTERNAL_SERVER_ERROR); // Lock 획득 실패
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(
                    ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private int calculateCurrentSeasonWeek() {
        // Redis에서 현재 시즌 주차 관리
        String key = "league:season:current";
        String value = redisTemplate.opsForValue().get(key);

        if (value != null) {
            return Integer.parseInt(value);
        }

        // 초기값 설정 (최초 실행 시): 날짜 기반
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        WeekFields weekFields = WeekFields.ISO;
        int initialWeek = now.getYear() * 100 + now.get(weekFields.weekOfWeekBasedYear());

        redisTemplate.opsForValue().set(key, String.valueOf(initialWeek));
        return initialWeek;
    }

    private boolean isGroupFull(Long groupId) {
        long count = userRepository.countByLeagueGroupId(groupId);
        return count >= 10;
    }

    private LeagueGroup createNewGroup(LeagueTier tier, int seasonWeek) {
        LeagueGroup group = LeagueGroup.builder()
                .tier(tier)
                .seasonWeek(seasonWeek)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        return leagueGroupRepository.save(group);
    }

    /**
     * 문제 해결 시 리그 포인트 업데이트
     * - 중복 해결 여부를 체크하고, 최초 해결 시 포인트 지급
     */
    public int updateLeaguePointForSolvedProblem(User user, Problem problem) {
        int totalEarnedPoints = 0;

        // 1. 문제 풀이 기본 점수 (최초 1회)
        // 기존: long successCount =
        // submissionLogRepository.countByUserIdAndProblemId(user.getId(),
        // problem.getId());
        // 변경: 성공한 제출만 카운트 (실패 후 성공 시에도 1이 되어야 함)
        long successCount = submissionLogRepository.countByUserIdAndProblemIdAndIsSuccessTrue(user.getId(),
                problem.getId());

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
            System.out.println(
                    "🏆 League Point Updated! User: " + user.getNickname() + ", Points: +" + totalEarnedPoints);
        }

        return totalEarnedPoints;
    }

    private void updateStreak(User user) {
        // KST 기준 현재 시간
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));

        // 오전 6시 이전이라면 하루 전날로 계산 (solvedDate 기준)
        if (now.getHour() < 6) {
            now = now.minusDays(1);
        }

        LocalDate todayStreakDate = now.toLocalDate();
        LocalDate yesterdayStreakDate = todayStreakDate.minusDays(1);

        boolean alreadySolvedToday = user.getLastSolvedDate() != null
                && user.getLastSolvedDate().equals(todayStreakDate);

        if (!alreadySolvedToday) {
            boolean continuesStreak = user.getLastSolvedDate() != null
                    && user.getLastSolvedDate().equals(yesterdayStreakDate);
            user.updateStreak(continuesStreak, todayStreakDate);
        }
    }

    public int getUserRank(User user) {
        if (user.getLeagueGroupId() != null) {
            return (int) userRepository.countByLeagueGroupIdAndLeaguePointGreaterThan(
                    user.getLeagueGroupId(), user.getLeaguePoint()) + 1;
        } else {
            return (int) userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;
        }
    }

    @Transactional(readOnly = true)
    public LeagueStatusResponse getMyLeagueStatus(Long userId) {
        User user = getUser(userId);
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
            LeagueStatus status = LeagueStatus.STAY;

            if (currentRank <= promoteCount) {
                status = LeagueStatus.PROMOTE;
            } else if (currentRank > (totalGroupMembers - demoteCount)) {
                status = LeagueStatus.DEMOTE;
            }

            members.add(LeagueRankingMemberDto.builder()
                    .rank(currentRank++)
                    .name(u.getNickname())
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
                user.getMaxLeague() != null ? user.getMaxLeague().name() : null,
                myLeagueMembers,
                myPercentile,
                leagueStats,
                members);
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
    public WeeklyPointSummaryResponse getWeeklyPointSummary(Long userId,
            java.time.LocalDate date) {
        User user = getUser(userId);
        // Use provided date or default to now
        java.time.ZonedDateTime referenceTime;
        if (date != null) {
            // If date is provided, use it at current time (or end of day? let's stick to
            // preserving time or just noon)
            // Ideally, we just need a point in time to find the containing "Week"

            // Note: We need to be careful. The week starts on Wednesday 06:00.
            // If user selects Wednesday, does it calculate from that Wednesday 6am?
            // Let's assume the date provided is in KST context.
            referenceTime = date.atStartOfDay(ZoneId.of("Asia/Seoul")).plusHours(12); // Noon on that day to
                                                                                      // be safe
        } else {
            referenceTime = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        }

        // Find the start of the current week (Wednesday 06:00 KST)
        java.time.ZonedDateTime startOfWeek = referenceTime
                .with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.WEDNESDAY))
                .withHour(6).withMinute(0).withSecond(0).withNano(0);

        // If reference time is before Wednesday 06:00, the week started last Wednesday
        if (referenceTime.isBefore(startOfWeek)) {
            startOfWeek = startOfWeek.minusWeeks(1);
        }

        ZonedDateTime endOfWeek = startOfWeek.plusWeeks(1);

        // Convert to LocalDateTime for DB query
        LocalDateTime start = startOfWeek.toLocalDateTime();
        LocalDateTime end = endOfWeek.toLocalDateTime();

        List<PointLog> logs = pointLogRepository.findAllByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                user.getId(), start, end);

        int totalScore = logs.stream()
                .mapToInt(PointLog::getAmount)
                .sum();

        List<PointActivityDto> activities = logs.stream()
                .map(log -> PointActivityDto.builder()
                        .description(log.getDescription())
                        .amount(log.getAmount())
                        .createdAt(log.getCreatedAt())
                        .category(log.getCategory())
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return WeeklyPointSummaryResponse.builder()
                .totalScore(totalScore)
                .startDate(start)
                .endDate(end)
                .activities(activities)
                .build();
    }

    private int calculateProblemPoint(String tier) {
        return SolvedAcLevelUtil.getPointFromTier(tier);
    }

    @Transactional(readOnly = true)
    public List<LeagueProgressResponse> getLeagueProgress(Long userId) {
        User user = getUser(userId);
        List<LeagueProgressResponse> progressList = new ArrayList<>();

        // 1. Fetch History
        List<LeagueHistory> histories = leagueHistoryRepository
                .findAllByUserIdOrderBySeasonWeekAsc(user.getId());

        for (LeagueHistory h : histories) {
            // closedAt is the END of the week (Wednesday 06:00)
            // Start date would be 7 days before closedAt
            LocalDate end = h.getClosedAt().toLocalDate();
            LocalDate start = end.minusDays(7);

            progressList.add(LeagueProgressResponse.builder()
                    .league(h.getLeague().name().toLowerCase())
                    .score(h.getFinalPoint())
                    .date(start)
                    .periodEnd(end)
                    .leagueIndex(h.getLeague().ordinal())
                    .build());
        }

        // 2. Append Current Status
        // Current week calculation
        ZonedDateTime nowKst = ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        ZonedDateTime startOfWeek = nowKst
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.WEDNESDAY))
                .withHour(6).withMinute(0).withSecond(0).withNano(0);
        if (nowKst.isBefore(startOfWeek)) {
            startOfWeek = startOfWeek.minusWeeks(1);
        }
        java.time.ZonedDateTime endOfWeek = startOfWeek.plusWeeks(1);

        progressList.add(LeagueProgressResponse.builder()
                .league(user.getLeague().name().toLowerCase())
                .score(user.getLeaguePoint())
                .date(startOfWeek.toLocalDate())
                .periodEnd(endOfWeek.toLocalDate())
                .leagueIndex(user.getLeague().ordinal())
                .build());

        return progressList;
    }

    /**
     * 현재 시즌 종료 처리
     * - 각 리그 그룹의 최종 순위 산정
     * - LeagueHistory에 기록 저장
     * - 3명 이하 그룹은 스킵 (경쟁 무의미)
     */
    public void closeSeason() {
        int currentSeasonWeek = calculateCurrentSeasonWeek();
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        // 현재 시즌의 모든 그룹 조회
        List<LeagueGroup> groups = leagueGroupRepository
                .findBySeasonWeek(currentSeasonWeek);

        for (com.peekle.domain.league.entity.LeagueGroup group : groups) {
            // 그룹 내 모든 유저를 점수 기준으로 정렬
            List<User> users = userRepository.findByLeagueGroupIdOrderByLeaguePointDesc(group.getId());
            int groupSize = users.size();

            // 3명 이하 그룹은 스킵 (다음 주 재배정 대기)
            if (groupSize <= 3) {
                // 유저들의 그룹만 해제, 티어와 포인트는 유지
                for (User user : users) {
                    user.resetForNewSeason(); // leaguePoint=0, leagueGroupId=null
                }
                userRepository.saveAll(users);
                continue; // 히스토리 기록 없이 다음 그룹으로
            }

            // 4명 이상 그룹: 정상 처리
            for (int i = 0; i < users.size(); i++) {
                User user = users.get(i);
                int rank = i + 1;

                // 승급/강등/유지 판정
                String result = determineSeasonResult(rank, users.size(), user.getLeague());

                // 히스토리 저장
                LeagueHistory history = LeagueHistory
                        .builder()
                        .user(user)
                        .league(user.getLeague())
                        .finalPoint(user.getLeaguePoint())
                        .result(result)
                        .seasonWeek(currentSeasonWeek)
                        .closedAt(now)
                        .rank(rank)
                        .leagueGroupId(group.getId())
                        .build();

                leagueHistoryRepository.save(history);
            }
        }
    }

    /**
     * 신규 시즌 시작
     * - 모든 유저의 티어 조정 (승급/강등 적용)
     * - 리그 포인트 초기화
     * - 새로운 그룹 생성 및 재배정 (4명 이상만)
     */
    public void startNewSeason() {
        int previousSeasonWeek = calculateCurrentSeasonWeek();

        // 시즌 증가 (Redis 갱신)
        redisTemplate.opsForValue().increment("league:season:current");

        int newSeasonWeek = previousSeasonWeek + 1; // 다음 주차

        // 1. 모든 유저의 지난 시즌 결과 조회 및 티어 조정
        List<LeagueHistory> histories = leagueHistoryRepository
                .findBySeasonWeek(previousSeasonWeek);

        for (LeagueHistory history : histories) {
            User user = history.getUser();

            // 승급/강등 적용
            if ("PROMOTED".equals(history.getResult())) {
                user.promoteLeague();
            } else if ("DEMOTED".equals(history.getResult())) {
                user.demoteLeague();
            }

            // 리그 포인트 초기화 및 그룹 해제
            user.resetForNewSeason();
            userRepository.save(user);
        }

        // 2. 티어별로 유저를 그룹화하여 새 그룹 생성
        for (LeagueTier tier : LeagueTier.values()) {
            // 해당 티어의 모든 유저 조회 (그룹 없는 유저만)
            List<User> tierUsers = userRepository

                    .findByLeagueAndLeagueGroupIdIsNull(tier);

            // 4명 미만이면 그룹 생성 안 함 (다음 주 대기)
            if (tierUsers.size() < 4) {
                continue;
            }

            // 10명씩 묶어서 그룹 생성, 마지막 그룹은 4-10명
            for (int i = 0; i < tierUsers.size(); i += 10) {
                int endIndex = Math.min(i + 10, tierUsers.size());
                List<User> groupUsers = tierUsers.subList(i, endIndex);

                // 마지막 조각이 4명 미만이면 이전 그룹에 합침
                if (groupUsers.size() < 4 && i > 0) {
                    // 이전 그룹의 ID를 가져와서 추가
                    Long lastGroupId = tierUsers.get(i - 1).getLeagueGroupId();
                    for (User user : groupUsers) {
                        user.assignToLeagueGroup(lastGroupId);
                        userRepository.save(user);
                    }
                } else if (groupUsers.size() >= 4) {
                    // 새 그룹 생성
                    LeagueGroup newGroup = createNewGroup(tier, newSeasonWeek);

                    // 유저들을 새 그룹에 배정
                    for (User user : groupUsers) {
                        user.assignToLeagueGroup(newGroup.getId());
                        userRepository.save(user);
                    }
                }
            }
        }
    }

    /**
     * 시즌 종료 시 승급/강등/유지 판정
     * - 3명 이하: MAINTAINED (closeSeason에서 이미 필터링됨)
     * - 4-6명: 상위 1명 승급, 하위 1명 강등
     * - 7-9명: 상위 2명 승급, 하위 2명 강등
     * - 10명 이상: 30% 승급/강등
     */
    private String determineSeasonResult(int rank, int totalUsers, LeagueTier currentTier) {
        // 안전 장치: 3명 이하는 변동 없음
        if (totalUsers <= 3) {
            return "MAINTAINED";
        }

        int promoteCount;
        int demoteCount;

        if (totalUsers <= 6) {
            // 4-6명: 1명씩
            promoteCount = 1;
            demoteCount = 1;
        } else if (totalUsers <= 9) {
            // 7-9명: 2명씩
            promoteCount = 2;
            demoteCount = 2;
        } else {
            // 10명 이상: 30% 규칙
            promoteCount = (int) Math.ceil(totalUsers * (currentTier.getPromotePercent() / 100.0));
            promoteCount = Math.min(promoteCount, totalUsers - 1);

            demoteCount = (int) Math.ceil(totalUsers * (currentTier.getDemotePercent() / 100.0));
            demoteCount = Math.min(demoteCount, totalUsers - promoteCount - 1);
        }

        // 상위 promoteCount명: 승급 (단, 최상위 티어는 제외)
        if (rank <= promoteCount && currentTier != LeagueTier.RUBY) {
            return "PROMOTED";
        }

        // 하위 demoteCount명: 강등 (단, 최하위 티어는 제외)
        if (rank > (totalUsers - demoteCount) && currentTier != LeagueTier.STONE) {
            return "DEMOTED";
        }

        // 나머지: 유지
        return "MAINTAINED";
    }

    @Transactional(readOnly = true)
    public LeagueHistoryResponse getUnviewedHistory(Long userId) {
        // User not needed for query, but maybe for validation?
        // findTopByUserId... uses userId directly.
        return leagueHistoryRepository.findTopByUserIdAndIsViewedFalseOrderBySeasonWeekDesc(userId)
                .map(LeagueHistoryResponse::from)
                .orElse(null);
    }

    public void markHistoryAsViewed(Long historyId, Long userId) {
        User user = getUser(userId);
        LeagueHistory history = leagueHistoryRepository.findById(historyId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.LEAGUE_HISTORY_NOT_FOUND));

        if (!history.getUser().getId().equals(user.getId())) {
            throw new BusinessException(
                    ErrorCode.ACCESS_DENIED);
        }

        // 최신 내역을 확인했다면, 밀려있는 이전 내역들도 모두 읽음 처리 (스팸 방지)
        leagueHistoryRepository.markAllAsViewedByUserId(user.getId());
    }

    @Transactional(readOnly = true)
    public List<LeagueRankingMemberDto> getLeagueHistoryRanking(Long historyId, Long userId) {
        User user = getUser(userId);
        LeagueHistory history = leagueHistoryRepository.findById(historyId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.LEAGUE_HISTORY_NOT_FOUND));

        if (!history.getUser().getId().equals(user.getId())) {
            throw new BusinessException(
                    ErrorCode.ACCESS_DENIED);
        }

        if (history.getLeagueGroupId() == null) {
            return new ArrayList<>();
        }

        List<LeagueHistory> groupHistories = leagueHistoryRepository
                .findAllByLeagueGroupIdAndSeasonWeekOrderByRankAsc(history.getLeagueGroupId(), history.getSeasonWeek());

        return groupHistories.stream()
                .map(h -> {
                    LeagueStatus status;
                    if ("PROMOTED".equals(h.getResult()))
                        status = LeagueStatus.PROMOTE;
                    else if ("DEMOTED".equals(h.getResult()))
                        status = LeagueStatus.DEMOTE;
                    else
                        status = LeagueStatus.STAY;

                    return LeagueRankingMemberDto.builder()
                            .rank(h.getRank() != null ? h.getRank() : 0)
                            .name(h.getUser().getNickname())
                            .profileImgThumb(h.getUser().getProfileImgThumb())
                            .score(h.getFinalPoint())
                            .me(h.getUser().getId().equals(user.getId()))
                            .status(status)
                            .build();
                })
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * 사용자의 현재 리그 상태 (순위, 승급/강등 상태, 점수 차이) 계산
     * SubmissionService, ExtensionStatus 등에서 재사용
     */
    public UserLeagueStatusDto getUserLeagueStatus(User user) {
        int groupRank = 1;
        LeagueStatus leagueStatus = LeagueStatus.STAY;
        Integer pointsToPromotion = null;
        Integer pointsToMaintenance = null;

        if (user.getLeagueGroupId() != null) {
            // 그룹 내 순위 계산
            groupRank = (int) userRepository.countByLeagueGroupIdAndLeaguePointGreaterThan(
                    user.getLeagueGroupId(), user.getLeaguePoint()) + 1;

            // 그룹 총 인원
            int totalGroupMembers = userRepository.countByLeagueGroupId(user.getLeagueGroupId());

            // 승급/강등 인원 계산
            LeagueTier currentTier = user.getLeague();
            if (totalGroupMembers > 1) {
                int promoteCount = (int) Math.ceil(totalGroupMembers * (currentTier.getPromotePercent() / 100.0));
                promoteCount = Math.min(promoteCount, totalGroupMembers - 1);

                int demoteCount = (int) Math.ceil(totalGroupMembers * (currentTier.getDemotePercent() / 100.0));
                demoteCount = Math.min(demoteCount, totalGroupMembers - promoteCount - 1);

                // 상태 결정
                if (groupRank <= promoteCount) {
                    leagueStatus = LeagueStatus.PROMOTE;
                } else if (groupRank > (totalGroupMembers - demoteCount)) {
                    leagueStatus = LeagueStatus.DEMOTE;
                }

                // 점수 차이 계산을 위해 그룹 유저 조회
                List<User> groupUsers = userRepository
                        .findTop100ByLeagueGroupIdOrderByLeaguePointDesc(user.getLeagueGroupId());

                // 승급권/유지권 분류
                List<User> promoters = new ArrayList<>();
                List<User> maintainers = new ArrayList<>();

                for (int i = 0; i < groupUsers.size(); i++) {
                    int rank = i + 1;
                    if (rank <= promoteCount) {
                        promoters.add(groupUsers.get(i));
                    } else if (rank <= (totalGroupMembers - demoteCount)) {
                        maintainers.add(groupUsers.get(i));
                    }
                }

                // 점수 차이 계산
                if (leagueStatus == LeagueStatus.PROMOTE) {
                    pointsToPromotion = 0; // 이미 승급권
                } else if (leagueStatus == LeagueStatus.DEMOTE) {
                    // 유지권으로 올라가기 위한 점수
                    if (!maintainers.isEmpty()) {
                        User lowestMaintainer = maintainers.get(maintainers.size() - 1);
                        pointsToMaintenance = Math.max(0,
                                lowestMaintainer.getLeaguePoint() - user.getLeaguePoint() + 1);
                    }
                } else {
                    // 승급권으로 올라가기 위한 점수
                    if (!promoters.isEmpty()) {
                        User lowestPromoter = promoters.get(promoters.size() - 1);
                        pointsToPromotion = Math.max(0, lowestPromoter.getLeaguePoint() - user.getLeaguePoint() + 1);
                    }
                }
            }
        } else {
            // 그룹이 없는 경우 전체 리그 순위
            groupRank = getUserRank(user);
        }

        return UserLeagueStatusDto.builder()
                .groupRank(groupRank)
                .leagueStatus(leagueStatus)
                .pointsToPromotion(pointsToPromotion)
                .pointsToMaintenance(pointsToMaintenance)
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
