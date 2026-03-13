package com.peekle.domain.league.service;

import com.peekle.domain.league.dto.LeagueStatusResponse;
import com.peekle.domain.league.entity.LeagueGroup;
import com.peekle.domain.league.entity.LeagueHistory;
import com.peekle.domain.league.enums.LeagueStatus;
import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.league.repository.LeagueGroupRepository;
import com.peekle.domain.league.repository.LeagueHistoryRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.boot.test.mock.mockito.MockBean;
import com.peekle.global.storage.R2StorageService;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class LeaguePromotionIntegrationTest {

        @Autowired
        private LeagueService leagueService;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private LeagueGroupRepository leagueGroupRepository;

        @Autowired
        private LeagueHistoryRepository leagueHistoryRepository;

        @Autowired
        private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

        private int currentSeasonWeek;

        @BeforeEach
        void setUp() {
                // Clean up
                redisTemplate.delete("league:season:current");
                leagueHistoryRepository.deleteAll();
                leagueGroupRepository.deleteAll();
                userRepository.deleteAll();

                ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
                WeekFields weekFields = WeekFields.ISO;
                currentSeasonWeek = now.getYear() * 100 + now.get(weekFields.weekOfWeekBasedYear());
        }

        private void createUsersInGroups(LeagueTier tier, int groupCount, int usersPerGroup) {
                // 현재 시즌 week 계산
                java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
                java.time.temporal.WeekFields weekFields = java.time.temporal.WeekFields.ISO;
                int currentSeasonWeek = now.getYear() * 100 + now.get(weekFields.weekOfWeekBasedYear());

                for (int g = 0; g < groupCount; g++) {
                        LeagueGroup group = LeagueGroup.builder()
                                        .tier(tier)
                                        .seasonWeek(currentSeasonWeek)
                                        .build();
                        leagueGroupRepository.save(group);

                        for (int u = 0; u < usersPerGroup; u++) {
                                String uniqueSuffix = g + "_" + u + "_"
                                                + java.util.UUID.randomUUID().toString().substring(0, 8);
                                User user = User.builder()
                                                .socialId(tier.name().toLowerCase() + "_user_" + uniqueSuffix)
                                                .provider("TEST")
                                                .nickname(tier.name().toLowerCase() + "_nick_" + uniqueSuffix)
                                                .bojId("boj_" + tier.name().toLowerCase() + "_" + uniqueSuffix)
                                                .league(tier)
                                                .leagueGroupId(group.getId())
                                                .leaguePoint(0)
                                                .profileImg("default.png")
                                                .profileImgThumb("default_thumb.png")
                                                .build();
                                userRepository.save(user);
                        }
                }
        }

        @Test
        @DisplayName("스톤4 브론즈15 실버26 골드37 플래티넘48 다이아59 루비63: 프리뷰와 실제 정산 일치")
        void testTierPopulationMatrix_PreviewMatchesSettlement() {
                Map<LeagueTier, Integer> matrix = new LinkedHashMap<>();
                matrix.put(LeagueTier.STONE, 4);
                matrix.put(LeagueTier.BRONZE, 15);
                matrix.put(LeagueTier.SILVER, 26);
                matrix.put(LeagueTier.GOLD, 37);
                matrix.put(LeagueTier.PLATINUM, 48);
                matrix.put(LeagueTier.DIAMOND, 59);
                matrix.put(LeagueTier.RUBY, 63);

                List<GroupScenario> scenarios = new ArrayList<>();
                for (Map.Entry<LeagueTier, Integer> entry : matrix.entrySet()) {
                        scenarios.addAll(createUsersWithTotalCount(entry.getKey(), entry.getValue()));
                }

                assignRankedPointsDetailed();

                // 티어별 예측값(총 승급/총 강등) [승급, 강등]
                // 점수 부여 규칙: 그룹별 하위 2명은 0점
                // 0점 정책: STONE 제외 모든 티어에서 0점은 순위와 무관하게 강등
                // STONE(4): [2, 0]   -> (4명:[2,0]) STONE은 강등 없음
                // BRONZE(15): [5, 4] -> (10명:[3,2]) + (5명:[2,2])  // 5명 그룹은 기본 강등 1 + 0점 강등 추가
                // SILVER(26): [8, 8] -> (10명:[3,3]) + (10명:[3,3]) + (6명:[2,2])
                // GOLD(37): [12,12]  -> (10명:[3,3]) * 3 + (7명:[3,3])
                // PLATINUM(48): [10,15] -> (10명:[2,3]) * 4 + (8명:[2,3])
                // DIAMOND(59): [6,18] -> (10명:[1,3]) * 5 + (9명:[1,3])
                // RUBY(63): [0,18]   -> (10명:[0,3]) * 6 + (3명:[0,0], 3명 이하는 정산 스킵)
                Map<LeagueTier, int[]> expectedByTier = new EnumMap<>(LeagueTier.class);
                expectedByTier.put(LeagueTier.STONE, new int[] { 2, 0 });
                expectedByTier.put(LeagueTier.BRONZE, new int[] { 5, 4 });
                expectedByTier.put(LeagueTier.SILVER, new int[] { 8, 8 });
                expectedByTier.put(LeagueTier.GOLD, new int[] { 12, 12 });
                expectedByTier.put(LeagueTier.PLATINUM, new int[] { 10, 15 });
                expectedByTier.put(LeagueTier.DIAMOND, new int[] { 6, 18 });
                expectedByTier.put(LeagueTier.RUBY, new int[] { 0, 18 });

                Map<LeagueTier, Long> previewPromotedByTier = new EnumMap<>(LeagueTier.class);
                Map<LeagueTier, Long> previewDemotedByTier = new EnumMap<>(LeagueTier.class);

                // 프리뷰(status API) 검증
                for (GroupScenario scenario : scenarios) {
                        Long viewerId = userRepository
                                        .findByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(scenario.groupId()).get(0)
                                        .getId();
                        LeagueStatusResponse preview = leagueService.getMyLeagueStatus(viewerId);
                        int[] expected = expectedMovementCounts(scenario.groupSize(), scenario.tier());

                        long previewPromoted = preview.getMembers().stream()
                                        .filter(m -> m.getStatus() == LeagueStatus.PROMOTE)
                                        .count();
                        long previewDemoted = preview.getMembers().stream()
                                        .filter(m -> m.getStatus() == LeagueStatus.DEMOTE)
                                        .count();

                        assertThat(previewPromoted).isEqualTo(expected[0]);
                        assertThat(previewDemoted).isEqualTo(expected[1]);

                        previewPromotedByTier.merge(scenario.tier(), previewPromoted, Long::sum);
                        previewDemotedByTier.merge(scenario.tier(), previewDemoted, Long::sum);
                }

                for (Map.Entry<LeagueTier, int[]> entry : expectedByTier.entrySet()) {
                        LeagueTier tier = entry.getKey();
                        int[] expected = entry.getValue();
                        assertThat(previewPromotedByTier.getOrDefault(tier, 0L)).isEqualTo((long) expected[0]);
                        assertThat(previewDemotedByTier.getOrDefault(tier, 0L)).isEqualTo((long) expected[1]);
                }

                // 실제 시즌 정산 검증
                leagueService.closeSeason();

                Map<LeagueTier, Long> actualPromotedByTier = new EnumMap<>(LeagueTier.class);
                Map<LeagueTier, Long> actualDemotedByTier = new EnumMap<>(LeagueTier.class);

                for (GroupScenario scenario : scenarios) {
                        int[] expected = expectedMovementCounts(scenario.groupSize(), scenario.tier());
                        List<LeagueHistory> histories = leagueHistoryRepository
                                        .findAllByLeagueGroupIdAndSeasonWeekOrderByRankAsc(
                                                        scenario.groupId(),
                                                        currentSeasonWeek);

                        if (scenario.groupSize() <= 3) {
                                assertThat(histories).isEmpty();
                                continue;
                        }

                        long actualPromoted = histories.stream()
                                        .filter(h -> "PROMOTED".equals(h.getResult()))
                                        .count();
                        long actualDemoted = histories.stream()
                                        .filter(h -> "DEMOTED".equals(h.getResult()))
                                        .count();

                        assertThat(actualPromoted).isEqualTo(expected[0]);
                        assertThat(actualDemoted).isEqualTo(expected[1]);

                        actualPromotedByTier.merge(scenario.tier(), actualPromoted, Long::sum);
                        actualDemotedByTier.merge(scenario.tier(), actualDemoted, Long::sum);
                }

                for (Map.Entry<LeagueTier, int[]> entry : expectedByTier.entrySet()) {
                        LeagueTier tier = entry.getKey();
                        int[] expected = entry.getValue();
                        assertThat(actualPromotedByTier.getOrDefault(tier, 0L)).isEqualTo((long) expected[0]);
                        assertThat(actualDemotedByTier.getOrDefault(tier, 0L)).isEqualTo((long) expected[1]);
                }
        }

        @Test
        @DisplayName("0점 5명(스톤 제외)은 정원과 무관하게 5명 강등")
        void testFiveZeroPoints_AllDemoted() {
                List<GroupScenario> scenarios = createUsersWithTotalCount(LeagueTier.SILVER, 10);
                Long groupId = scenarios.get(0).groupId();

                // 10명 중 하위 5명을 0점으로 설정: 0 0 0 0 0 1 2 3 4 5
                assignRankedPointsByGroup(groupId, 5);

                Long viewerId = userRepository.findByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(groupId).get(0).getId();
                LeagueStatusResponse preview = leagueService.getMyLeagueStatus(viewerId);

                long previewPromoted = preview.getMembers().stream()
                                .filter(m -> m.getStatus() == LeagueStatus.PROMOTE)
                                .count();
                long previewDemoted = preview.getMembers().stream()
                                .filter(m -> m.getStatus() == LeagueStatus.DEMOTE)
                                .count();

                assertThat(previewPromoted).isEqualTo(3); // SILVER 10명 승급 30% = 3명
                assertThat(previewDemoted).isEqualTo(5); // 0점 5명 전원 강등

                leagueService.closeSeason();
                List<LeagueHistory> histories = leagueHistoryRepository
                                .findAllByLeagueGroupIdAndSeasonWeekOrderByRankAsc(groupId, currentSeasonWeek);

                long actualPromoted = histories.stream()
                                .filter(h -> "PROMOTED".equals(h.getResult()))
                                .count();
                long actualDemoted = histories.stream()
                                .filter(h -> "DEMOTED".equals(h.getResult()))
                                .count();

                assertThat(actualPromoted).isEqualTo(3);
                assertThat(actualDemoted).isEqualTo(5);
        }

        private void assignRankedPointsDetailed() {
                List<Long> groupIds = userRepository.findAll().stream()
                                .map(User::getLeagueGroupId)
                                .filter(java.util.Objects::nonNull)
                                .distinct()
                                .collect(Collectors.toList());

                for (Long groupId : groupIds) {
                        assignRankedPointsByGroup(groupId, 2);
                }
        }

        private void assignRankedPointsByGroup(Long groupId, int zeroPointUsers) {
                List<User> groupUsers = userRepository.findByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(groupId);
                int boundedZeroUsers = groupUsers.size() > 3 ? Math.min(zeroPointUsers, groupUsers.size() - 1) : 0;
                int positiveUsers = groupUsers.size() - boundedZeroUsers;

                for (int i = 0; i < groupUsers.size(); i++) {
                        User user = groupUsers.get(i);
                        int points = i < positiveUsers ? (positiveUsers - i) : 0;
                        user.addLeaguePoint(points);
                }
                userRepository.saveAll(groupUsers);
        }

        private List<GroupScenario> createUsersWithTotalCount(LeagueTier tier, int totalUsers) {
                List<GroupScenario> scenarios = new ArrayList<>();
                int remaining = totalUsers;
                int groupIndex = 0;

                while (remaining > 0) {
                        int groupSize = Math.min(10, remaining);
                        LeagueGroup group = LeagueGroup.builder()
                                        .tier(tier)
                                        .seasonWeek(currentSeasonWeek)
                                        .build();
                        leagueGroupRepository.save(group);

                        for (int i = 0; i < groupSize; i++) {
                                String uniqueSuffix = "m_" + tier.name().toLowerCase() + "_" + groupIndex + "_" + i
                                                + "_" + java.util.UUID.randomUUID().toString().substring(0, 8);
                                User user = User.builder()
                                                .socialId("social_" + uniqueSuffix)
                                                .provider("TEST")
                                                .nickname("nick_" + uniqueSuffix)
                                                .bojId("boj_" + uniqueSuffix)
                                                .league(tier)
                                                .leagueGroupId(group.getId())
                                                .leaguePoint(0)
                                                .profileImg("default.png")
                                                .profileImgThumb("default_thumb.png")
                                                .build();
                                userRepository.save(user);
                        }

                        scenarios.add(new GroupScenario(tier, group.getId(), groupSize));
                        remaining -= groupSize;
                        groupIndex++;
                }

                return scenarios;
        }

        private int[] expectedMovementCounts(int totalUsers, LeagueTier tier) {
                int promote = 0;
                int demote = 0;
                int zeroPointUsers = 0;

                if (totalUsers > 3) {
                        zeroPointUsers = Math.min(2, totalUsers - 1);

                        promote = (int) Math.ceil(totalUsers * (tier.getPromotePercent() / 100.0));
                        promote = Math.min(promote, totalUsers - 1);

                        demote = (int) Math.ceil(totalUsers * (tier.getDemotePercent() / 100.0));
                        demote = Math.min(demote, totalUsers - promote - 1);
                }

                if (tier == LeagueTier.RUBY) {
                        promote = 0;
                }
                if (tier == LeagueTier.STONE) {
                        demote = 0;
                }

                int nonZeroUsers = totalUsers - zeroPointUsers;
                int expectedPromote = Math.min(promote, Math.max(0, nonZeroUsers));
                int expectedDemote = tier == LeagueTier.STONE ? 0 : Math.max(demote, zeroPointUsers);
                expectedDemote = Math.min(expectedDemote, totalUsers - expectedPromote);

                return new int[] { expectedPromote, expectedDemote };
        }

        private record GroupScenario(LeagueTier tier, Long groupId, int groupSize) {
        }

        @Test
        @DisplayName("가입 23명 동시 진행: 그룹 배정 확인 (10, 10, 3)")
        void testConcurrentSignupToStone_23Users() throws InterruptedException {
                int userCount = 23;
                ExecutorService executor = Executors.newFixedThreadPool(userCount);
                CountDownLatch latch = new CountDownLatch(userCount);

                for (int i = 0; i < userCount; i++) {
                        final int index = i;
                        executor.submit(() -> {
                                try {
                                        User user = User.builder()
                                                        .socialId("stone_concurrent_" + index)
                                                        .provider("TEST")
                                                        .nickname("stone_conn_" + index)
                                                        .bojId("boj_conn_" + index)
                                                        .profileImg("default.png")
                                                        .profileImgThumb("default_thumb.png")
                                                        .league(LeagueTier.STONE)
                                                        .leagueGroupId(null)
                                                        .build();
                                        userRepository.save(user);

                                        leagueService.assignInitialLeague(user);
                                } finally {
                                        latch.countDown();
                                }
                        });
                }
                latch.await();
                executor.shutdown();

                // Then
                List<User> stoneUsers = userRepository.findAll().stream()
                                .filter(u -> u.getLeague() == LeagueTier.STONE)
                                .collect(Collectors.toList());

                assertThat(stoneUsers).hasSize(userCount);

                Map<Long, Long> groupCounts = stoneUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeagueGroupId, Collectors.counting()));

                // Should be 3 groups: size 10, 10, 3
                List<Long> sizes = new java.util.ArrayList<>(groupCounts.values());
                java.util.Collections.sort(sizes);

                assertThat(groupCounts.size()).isEqualTo(3);
                assertThat(sizes).containsExactly(3L, 10L, 10L);
        }

        @Test
        @DisplayName("스톤 33명, 브론즈 3명 시즌 진행")
        void testSeasonTransition_33Stone_3Bronze() {
                // Given: 스톤 총 33명 (그룹 10, 10, 10, 3)
                createUsersInGroups(LeagueTier.STONE, 3, 10);
                createUsersInGroups(LeagueTier.STONE, 1, 3);

                // Given: 브론즈 3명 (그룹 3)
                createUsersInGroups(LeagueTier.BRONZE, 1, 3);

                // 점수 차등 부여 (각 그룹 하위 2명은 0점)
                assignRankedPointsDetailed();

                // When
                leagueService.closeSeason();
                leagueService.startNewSeason();

                // Then
                List<User> allUsers = userRepository.findAll();
                Map<LeagueTier, Long> tierCounts = allUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeague, Collectors.counting()));

                // 분석 (예상):
                // STONE 승급(30%):
                // - 10명 그룹 3개: 각 그룹당 3명 승급 => 9명
                // - 3명 그룹 1개: 인원 부족으로 평가(히스토리 기록) 스킵 => 0명 승급
                // => 합계 9명 승급 (-> BRONZE)
                // STONE 유지: 33 - 9 = 24명
                //
                // BRONZE 승급(30%) & 강등(20%):
                // - 3명 그룹 1개: 인원 부족으로 평가 스킵 => 승급/강등 0명
                // BRONZE 유지: 3 - 0 = 3명
                //
                // 최종 배정 (예상)
                // SILVER = 0명
                // BRONZE = 기존유지 3명 + STONE승급 9명 = 12명
                // STONE = 기존유지 24명 + BRONZE강등 0명 = 24명

                System.out.println("STONE count: " + tierCounts.getOrDefault(LeagueTier.STONE, 0L));
                System.out.println("BRONZE count: " + tierCounts.getOrDefault(LeagueTier.BRONZE, 0L));
                System.out.println("SILVER count: " + tierCounts.getOrDefault(LeagueTier.SILVER, 0L));

                assertThat(tierCounts.getOrDefault(LeagueTier.SILVER, 0L)).isEqualTo(0L);
                assertThat(tierCounts.getOrDefault(LeagueTier.BRONZE, 0L)).isEqualTo(12L);
                assertThat(tierCounts.getOrDefault(LeagueTier.STONE, 0L)).isEqualTo(24L);

                // 그룹 분배 검증
                // 1) STONE 24명: 10명, 10명, 4명 등 3개 그룹 기대
                List<User> finalStoneUsers = allUsers.stream()
                                .filter(u -> u.getLeague() == LeagueTier.STONE)
                                .collect(Collectors.toList());
                Map<Long, Long> stoneGroupCounts = finalStoneUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeagueGroupId, Collectors.counting()));

                System.out.println("STONE Generated Groups: " + stoneGroupCounts.values());
                assertThat(stoneGroupCounts.size()).isEqualTo(3);
                List<Long> stoneSizes = new java.util.ArrayList<>(stoneGroupCounts.values());
                java.util.Collections.sort(stoneSizes);
                assertThat(stoneSizes).containsExactly(4L, 10L, 10L); // 오름차순 정렬 시 4, 10, 10

                // 2) BRONZE 12명: 10명, 2명 등 2개 그룹 기대
                List<User> finalBronzeUsers = allUsers.stream()
                                .filter(u -> u.getLeague() == LeagueTier.BRONZE)
                                .collect(Collectors.toList());
                Map<Long, Long> bronzeGroupCounts = finalBronzeUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeagueGroupId, Collectors.counting()));

                System.out.println("BRONZE Generated Groups: " + bronzeGroupCounts.values());
                assertThat(bronzeGroupCounts.size()).isEqualTo(2);
                List<Long> bronzeSizes = new java.util.ArrayList<>(bronzeGroupCounts.values());
                java.util.Collections.sort(bronzeSizes);
                assertThat(bronzeSizes).containsExactly(2L, 10L); // 오름차순 정렬 시 2, 10
        }

        // 테스트 검증 로직 시뮬레이션을 위한 메인 메서드
        public static void main(String[] args) {
                System.out.println("========== 리그 승급/강등 로직 시뮬레이션 ==========");

                LeagueTier[] targetTiers = {
                                LeagueTier.BRONZE, LeagueTier.SILVER, LeagueTier.GOLD,
                                LeagueTier.PLATINUM, LeagueTier.EMERALD, LeagueTier.DIAMOND, LeagueTier.RUBY
                };

                for (LeagueTier tier : targetTiers) {
                        int users = 20;
                        int promoteCountPerGroup = (int) Math.floor(10 * (tier.getPromotePercent() / 100.0));
                        int demoteCountPerGroup = (int) Math.floor(10 * (tier.getDemotePercent() / 100.0));
                        System.out.printf("[%s] 기준: 승급 %d명 (%d%%), 강등 %d명 (%d%%) 확인%n",
                                        tier.name(), promoteCountPerGroup, tier.getPromotePercent(),
                                        demoteCountPerGroup, tier.getDemotePercent());
                }
        }
}
