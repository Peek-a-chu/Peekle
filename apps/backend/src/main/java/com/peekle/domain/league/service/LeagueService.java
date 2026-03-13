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

        // 단일 인스턴스(테스트) 환경에서 Redisson 초기화 시 발생할 수 있는 race condition을 방지하기 위해 JVM
        // synchronized 추가
        synchronized (this) {
            RLock lock = redissonClient.getLock("league:assignment:lock");
            boolean isLockReleased = false;
            try {
                // Wait 15s, Lease -1 (Watchdog 활성화로 안전하게 점유 보장)
                if (lock.tryLock(15, -1, java.util.concurrent.TimeUnit.SECONDS)) {
                    try {
                        // 트랜잭션 내에서 영속성 컨텍스트 초기화를 위해 User를 DB에서 다시 조회 (stale read 방지)
                        User lockedUser = userRepository.findById(user.getId())
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                        if (lockedUser.getLeagueGroupId() != null) {
                            return; // 락을 대기하는 동안 이미 배정되었을 수 있음
                        }

                        // 1. 현재 주차 계산
                        int currentSeasonWeek = calculateCurrentSeasonWeek();

                        // 2. 인원이 채워지지 않은 그룹 찾기 (10명 미만)
                        java.util.List<LeagueGroup> availableGroups = leagueGroupRepository.findAvailableGroup(
                                LeagueTier.STONE, currentSeasonWeek,
                                org.springframework.data.domain.PageRequest.of(0, 1));

                        LeagueGroup group;
                        if (!availableGroups.isEmpty()) {
                            group = availableGroups.get(0);
                        } else {
                            group = createNewGroup(LeagueTier.STONE, currentSeasonWeek);
                        }

                        // 4. 유저에게 그룹 할당 및 저장
                        lockedUser.updateLeagueGroup(group.getId());
                        userRepository.save(lockedUser); // 영속성 컨텍스트 반영

                    } finally {
                        // 트랜잭션이 커밋된 후에 락을 해제하도록 동기화 훅 등록
                        if (org.springframework.transaction.support.TransactionSynchronizationManager
                                .isSynchronizationActive()) {
                            org.springframework.transaction.support.TransactionSynchronizationManager
                                    .registerSynchronization(
                                            new org.springframework.transaction.support.TransactionSynchronization() {
                                                @Override
                                                public void afterCompletion(int status) {
                                                    lock.unlock();
                                                }
                                            });
                            isLockReleased = true; // 트랜잭션 종료 시 자동 해제 예정
                        }
                    }
                } else {
                    throw new BusinessException(
                            ErrorCode.INTERNAL_SERVER_ERROR); // Lock 획득 실패
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new BusinessException(
                        ErrorCode.INTERNAL_SERVER_ERROR);
            } finally {
                // 트랜잭션 동기화에 등록되지 않았다면 즉시 해제 (ex: 테스트 또는 트랜잭션 밖 호출)
                if (!isLockReleased && lock.isHeldByCurrentThread()) {
                    lock.unlock();
                }
            }
        }
    }

    private int calculateCurrentSeasonWeek() {
        // Redis에서 현재 시즌 주차 관리
        String key = "league:season:current";
        String value = redisTemplate.opsForValue().get(key);

        if (value != null) {
            return Integer.parseInt(value);
        }

        // 초기값 설정 (최초 실행 시): 날짜 기반 (ISO week date)
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        WeekFields weekFields = WeekFields.ISO;
        int initialWeek = now.get(weekFields.weekBasedYear()) * 100 + now.get(weekFields.weekOfWeekBasedYear());

        redisTemplate.opsForValue().set(key, String.valueOf(initialWeek));
        return initialWeek;
    }

    private int getNextSeasonWeek(int currentSeasonWeek) {
        int year = currentSeasonWeek / 100;
        int week = currentSeasonWeek % 100;

        // 날짜를 기준으로 다음 주차의 연도 및 주차를 정확히 계산
        LocalDate date = LocalDate.of(year, 1, 4); // 1월 4일은 무조건 첫째 주에 포함됨 (ISO 규칙)
        date = date.plusWeeks(week - 1).plusWeeks(1);

        WeekFields weekFields = WeekFields.ISO;
        return date.get(weekFields.weekBasedYear()) * 100 + date.get(weekFields.weekOfWeekBasedYear());
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
            return (int) userRepository.countRankByLeagueGroupId(
                    user.getLeagueGroupId(), user.getLeaguePoint(), user.getUpdatedAt()) + 1;
        } else {
            return (int) userRepository.countRankGlobal(user.getLeaguePoint(), user.getUpdatedAt()) + 1;
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
            groupUsers = userRepository
                    .findTop100ByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(user.getLeagueGroupId());
            totalGroupMembers = userRepository.countByLeagueGroupId(user.getLeagueGroupId());
        } else {
            // 그룹 없는 경우: 같은 티어의 미배정 유저(leagueGroupId == null)만 조회
            groupUsers = userRepository.findByLeagueAndLeagueGroupIdIsNull(user.getLeague());
            totalGroupMembers = groupUsers.size();
        }

        // 승급/강등 인원 계산 (시즌 종료 판정 로직과 동일한 기준)
        LeagueTier currentTier = user.getLeague();
        List<LeagueRankingMemberDto> members = new ArrayList<>();
        int currentRank = 1;
        for (User u : groupUsers) {
            LeagueStatus status = determineLiveLeagueStatus(
                    currentRank,
                    totalGroupMembers,
                    currentTier,
                    u.getLeaguePoint());

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
                members,
                user.getLeagueGroupId());
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
            // 그룹 내 모든 유저를 점수 기준(동점시 업데이트순)으로 정렬
            List<User> users = userRepository.findByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(group.getId());
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

                // 승급/강등/유지 판정 (현재 점수 포함)
                String result = determineSeasonResult(rank, users.size(), user.getLeague(), user.getLeaguePoint());

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

        int newSeasonWeek = getNextSeasonWeek(previousSeasonWeek);
        redisTemplate.opsForValue().set("league:season:current", String.valueOf(newSeasonWeek));

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
            // 해당 티어의 모든 유저 조회 (이 시점엔 모두 그룹이 null이 됨)
            List<User> tierUsers = userRepository
                    .findByLeagueAndLeagueGroupIdIsNull(tier);

            if (tierUsers.isEmpty()) {
                continue;
            }

            // 10명씩 묶어서 그룹 생성
            for (int i = 0; i < tierUsers.size(); i += 10) {
                int endIndex = Math.min(i + 10, tierUsers.size());
                List<User> groupUsers = tierUsers.subList(i, endIndex);

                // 새 그룹 생성 (인원수 상관없이 생성)
                LeagueGroup newGroup = createNewGroup(tier, newSeasonWeek);

                // 유저들을 새 그룹에 배정
                for (User user : groupUsers) {
                    user.assignToLeagueGroup(newGroup.getId());
                    userRepository.save(user);
                }
            }
        }
    }

    /**
     * 시즌 인원별 승급/강등 인원 계산
     * - 3명 이하: 승급/강등 없음
     * - 4명 이상: 티어별 퍼센트 규칙을 올림(Ceiling) 적용
     */
    private int[] calculateSeasonMovementCounts(int totalUsers, LeagueTier currentTier) {
        int promoteCount = 0;
        int demoteCount = 0;

        if (totalUsers <= 3) {
            // no-op
        } else {
            promoteCount = (int) Math.ceil(totalUsers * (currentTier.getPromotePercent() / 100.0));
            promoteCount = Math.min(promoteCount, totalUsers - 1);

            demoteCount = (int) Math.ceil(totalUsers * (currentTier.getDemotePercent() / 100.0));
            demoteCount = Math.min(demoteCount, totalUsers - promoteCount - 1);
        }

        // 실제 시즌 반영 규칙과 동일하게 최대/최소 티어 예외 적용
        if (currentTier == LeagueTier.RUBY) {
            promoteCount = 0;
        }
        if (currentTier == LeagueTier.STONE) {
            demoteCount = 0;
        }

        return new int[] { promoteCount, demoteCount };
    }

    /**
     * 현재 시즌 진행 중 프리뷰 상태 계산
     * - 0점은 승급 불가, STONE을 제외하고 순위와 무관하게 강등
     */
    private LeagueStatus determineLiveLeagueStatus(int rank, int totalUsers, LeagueTier currentTier, int userPoint) {
        if (totalUsers <= 3) {
            return LeagueStatus.STAY;
        }

        int[] movementCounts = calculateSeasonMovementCounts(totalUsers, currentTier);
        int promoteCount = movementCounts[0];
        int demoteCount = movementCounts[1];

        if (userPoint <= 0) {
            return currentTier == LeagueTier.STONE ? LeagueStatus.STAY : LeagueStatus.DEMOTE;
        }

        if (rank <= promoteCount) {
            return LeagueStatus.PROMOTE;
        }

        if (rank > (totalUsers - demoteCount)) {
            return LeagueStatus.DEMOTE;
        }

        return LeagueStatus.STAY;
    }

    /**
     * 시즌 종료 시 승급/강등/유지 판정
     */
    private String determineSeasonResult(int rank, int totalUsers, LeagueTier currentTier, int userPoint) {
        // 안전 장치: 3명 이하는 변동 없음
        if (totalUsers <= 3) {
            return "MAINTAINED";
        }

        LeagueStatus status = determineLiveLeagueStatus(rank, totalUsers, currentTier, userPoint);
        if (status == LeagueStatus.PROMOTE) {
            return "PROMOTED";
        }
        if (status == LeagueStatus.DEMOTE) {
            return "DEMOTED";
        }
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
        int totalGroupMembers = 0;

        if (user.getLeagueGroupId() != null) {
            // 그룹 내 순위 계산
            groupRank = (int) userRepository.countRankByLeagueGroupId(
                    user.getLeagueGroupId(), user.getLeaguePoint(), user.getUpdatedAt()) + 1;

            // 그룹 총 인원
            totalGroupMembers = userRepository.countByLeagueGroupId(user.getLeagueGroupId());

            // 승급/강등 인원 계산 (시즌 종료 판정 로직과 동일한 기준)
            LeagueTier currentTier = user.getLeague();
            if (totalGroupMembers > 1) {
                // 상태 결정 (0점은 STONE 제외 무조건 강등)
                leagueStatus = determineLiveLeagueStatus(
                        groupRank,
                        totalGroupMembers,
                        currentTier,
                        user.getLeaguePoint());

                // 점수 차이 계산을 위해 그룹 유저 조회
                List<User> groupUsers = userRepository
                        .findTop100ByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(user.getLeagueGroupId());

                // 승급권/유지권 분류
                List<User> promoters = new ArrayList<>();
                List<User> maintainers = new ArrayList<>();

                for (int i = 0; i < groupUsers.size(); i++) {
                    User groupUser = groupUsers.get(i);
                    int rank = i + 1;
                    LeagueStatus memberStatus = determineLiveLeagueStatus(
                            rank,
                            totalGroupMembers,
                            currentTier,
                            groupUser.getLeaguePoint());
                    if (memberStatus == LeagueStatus.PROMOTE) {
                        promoters.add(groupUser);
                    } else if (memberStatus == LeagueStatus.STAY) {
                        maintainers.add(groupUser);
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
                .totalGroupMembers(totalGroupMembers)
                .build();
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
