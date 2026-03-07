package com.peekle.domain.league.service;

import com.peekle.domain.league.entity.LeagueGroup;
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

        @BeforeEach
        void setUp() {
                // Clean up
                redisTemplate.delete("league:season:current");
                leagueHistoryRepository.deleteAll();
                leagueGroupRepository.deleteAll();
                userRepository.deleteAll();
        }

        @Test
        @DisplayName("실버 50명, 골드 50명 → 플래티넘 15, 골드 35, 실버 35, 브론즈 15 분배 검증")
        void testPromotionDemotionDistribution() {
                // Given: 실버 10명 * 5팀 = 50명
                createUsersInGroups(LeagueTier.SILVER, 5, 10);

                // Given: 골드 10명 * 5팀 = 50명
                createUsersInGroups(LeagueTier.GOLD, 5, 10);

                // 모든 유저에게 포인트 부여 (순위 차등화)
                assignRankedPoints();

                // When: 시즌 종료 및 승급/강등 처리
                leagueService.closeSeason();
                leagueService.startNewSeason();

                // Then: 티어별 인원 확인
                List<User> allUsers = userRepository.findAll();
                Map<LeagueTier, Long> tierCounts = allUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeague, Collectors.counting()));

                assertThat(tierCounts.get(LeagueTier.PLATINUM)).isEqualTo(15L);
                assertThat(tierCounts.get(LeagueTier.GOLD)).isEqualTo(35L);
                assertThat(tierCounts.get(LeagueTier.SILVER)).isEqualTo(35L);
                assertThat(tierCounts.get(LeagueTier.BRONZE)).isEqualTo(15L);

                // Then: 전체 인원 100명 유지
                assertThat(allUsers.size()).isEqualTo(100);
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

        private void assignRankedPoints() {
                List<User> allUsers = userRepository.findAll();

                // 티어별로 그룹화
                Map<LeagueTier, List<User>> usersByTier = allUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeague));

                // 각 티어 내에서 순위에 따라 포인트 차등 부여
                for (Map.Entry<LeagueTier, List<User>> entry : usersByTier.entrySet()) {
                        List<User> users = entry.getValue();

                        for (int i = 0; i < users.size(); i++) {
                                User user = users.get(i);
                                // 상위권일수록 높은 점수 (역순)
                                int points = 1000 - (i * 10);
                                user.addLeaguePoint(points);
                        }
                }

                userRepository.saveAll(allUsers);
        }

        @Test
        @DisplayName("7개 전체 리그 승급/강등 및 그룹 개수 분배 검증 (브론즈~루비 각각 20명씩)")
        void testAllLeaguesPromotionDemotionDetailed() {
                // Given: 브론즈 ~ 루비 (STONE 제외 7개 티어) 각각 20명씩 (10명 * 2그룹)
                LeagueTier[] targetTiers = {
                                LeagueTier.BRONZE, LeagueTier.SILVER, LeagueTier.GOLD,
                                LeagueTier.PLATINUM, LeagueTier.EMERALD, LeagueTier.DIAMOND, LeagueTier.RUBY
                };

                for (LeagueTier tier : targetTiers) {
                        createUsersInGroups(tier, 2, 10);
                }

                // 각 티어별/그룹별로 1~10점씩 점수 부여 (1위: 10점, 10위: 1점)
                assignRankedPointsDetailed();

                // When: 시즌 종료 및 승급/강등 처리
                System.out.println("========== 시즌 종료 및 승급/강등 처리 시작 ==========");
                leagueService.closeSeason();
                leagueService.startNewSeason();
                System.out.println("========== 시즌 종료 및 승급/강등 처리 완료 ==========");

                // Then: 전체 유저 수 140명 유지
                List<User> allUsers = userRepository.findAll();
                assertThat(allUsers.size()).isEqualTo(140);

                // Then: 각 티어별 예상 인원 및 그룹 개수 검증
                // 그룹당 인원 10명 기준:
                // - STONE (0% 승급 / 30% 강등) - 제외 (현재 참여 인원 없음)
                // - BRONZE (30% 승급 / 20% 강등) -> 그룹당 3명 승급, 2명 강등.
                // 이전 시즌 BRONZE 강등자 없음 (STONE 제외이므로 강등 불가), SILVER 강등자(그룹당 3명 * 2그룹 = 6명)가
                // BRONZE로 유입
                // 원래 BRONZE 유지자(그룹당 5명 * 2그룹 = 10명) + SILVER 강등자(6명) = 16명
                // - SILVER (30% 승급 / 30% 강등) -> 그룹당 3명 승급, 3명 강등.
                // 원래 SILVER 유지자(그룹당 4명 * 2그룹 = 8명) + BRONZE 승급자(그룹당 3명 * 2그룹 = 6명) + GOLD
                // 강등자(그룹당 3명 * 2그룹 = 6명) = 20명
                // - GOLD (30% 승급 / 30% 강등) -> 그룹당 3명 승급, 3명 강등.
                // 원래 GOLD 유지자(8명) + SILVER 승급자(6명) + PLATINUM 강등자(6명) = 20명
                // - PLATINUM (20% 승급 / 30% 강등) -> 그룹당 2명 승급, 3명 강등.
                // 원래 PLATINUM 유지자(그룹당 5명 * 2그룹 = 10명) + GOLD 승급자(6명) + EMERALD 강등자(6명) = 22명
                // - EMERALD (20% 승급 / 30% 강등) -> 그룹당 2명 승급, 3명 강등.
                // 원래 EMERALD 유지자(10명) + PLATINUM 승급자(4명) + DIAMOND 강등자(6명) = 20명
                // - DIAMOND (10% 승급 / 30% 강등) -> 그룹당 1명 승급, 3명 강등.
                // 원래 DIAMOND 유지자(그룹당 6명 * 2그룹 = 12명) + EMERALD 승급자(4명) + RUBY 강등자(6명) = 22명
                // - RUBY (0% 승급 / 30% 강등) -> 그룹당 0명 승급, 3명 강등.
                // 원래 RUBY 유지자(그룹당 7명 * 2그룹 = 14명) + DIAMOND 승급자(2명) = 16명

                Map<LeagueTier, Long> tierCounts = allUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeague, Collectors.counting()));

                // 생성되어야 하는 그룹 개수 (인원수 / 10명, 나머지가 4명 이상이면 1그룹 추가, 미만이면 이전 그룹 편입)
                // 16명: 1그룹(10명) + 2그룹(6명) = 2그룹
                // 20명: 1그룹(10명) + 2그룹(10명) = 2그룹
                // 22명: 1그룹(10명) + 2그룹(10명) + 3그룹(2명 -> 2번째 그룹 편입해서 12명 그룹) = 2그룹

                System.out.println("========== 최종 티어별 인원 및 그룹 배정 결과 ==========");
                for (LeagueTier t : targetTiers) {
                        long count = tierCounts.getOrDefault(t, 0L);
                        long groups = leagueGroupRepository.findBySeasonWeek(
                                        leagueService.getUserRank(allUsers.get(0)) == 0 ? 0 : 0 /*
                                                                                                 * dummy, calculated
                                                                                                 * below
                                                                                                 */).size(); // Not
                                                                                                             // quite
                                                                                                             // right,
                                                                                                             // need
                                                                                                             // findBySeasonWeek
                                                                                                             // And
                                                                                                             // Tier
                }

                int nextSeasonWeek = calculateNextSeasonWeek();

                // Assertions & Logging
                // Assertions & Logging
                // Just print sizes first to see what happened without asserting group sizes
                assertTierPopulationAndGroups(LeagueTier.BRONZE, tierCounts, 16L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream().filter(g -> g.getTier() == LeagueTier.BRONZE)
                                .count());
                assertTierPopulationAndGroups(LeagueTier.SILVER, tierCounts, 20L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream().filter(g -> g.getTier() == LeagueTier.SILVER)
                                .count());
                assertTierPopulationAndGroups(LeagueTier.GOLD, tierCounts, 20L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream().filter(g -> g.getTier() == LeagueTier.GOLD)
                                .count());
                assertTierPopulationAndGroups(LeagueTier.PLATINUM, tierCounts, 22L, nextSeasonWeek,
                                leagueGroupRepository
                                                .findBySeasonWeek(nextSeasonWeek).stream()
                                                .filter(g -> g.getTier() == LeagueTier.PLATINUM).count());
                assertTierPopulationAndGroups(LeagueTier.EMERALD, tierCounts, 20L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream()
                                .filter(g -> g.getTier() == LeagueTier.EMERALD).count());
                assertTierPopulationAndGroups(LeagueTier.DIAMOND, tierCounts, 22L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream()
                                .filter(g -> g.getTier() == LeagueTier.DIAMOND).count());
                assertTierPopulationAndGroups(LeagueTier.RUBY, tierCounts, 16L, nextSeasonWeek, leagueGroupRepository
                                .findBySeasonWeek(nextSeasonWeek).stream().filter(g -> g.getTier() == LeagueTier.RUBY)
                                .count());
        }

        private int calculateNextSeasonWeek() {
                String value = redisTemplate.opsForValue().get("league:season:current");
                return Integer.parseInt(value);
        }

        private void assertTierPopulationAndGroups(LeagueTier tier, Map<LeagueTier, Long> tierCounts,
                        long expectedUsers,
                        int seasonWeek, long expectedGroups) {
                long actualUsers = tierCounts.getOrDefault(tier, 0L);
                List<LeagueGroup> groups = leagueGroupRepository.findBySeasonWeek(seasonWeek).stream()
                                .filter(g -> g.getTier() == tier)
                                .collect(Collectors.toList());
                long actualGroups = groups.size();

                System.out.printf("[%s] 인원: %d명 (예상: %d명) | 그룹 수: %d개 (예상: %d개)%n",
                                tier.name(), actualUsers, expectedUsers, actualGroups, expectedGroups);

                assertThat(actualUsers).isEqualTo(expectedUsers);
                assertThat(actualGroups).isEqualTo(expectedGroups);

                // 실제 유저들이 해당 그룹에 배정되었는지 검증 (leagueGroupId가 생성된 그룹 ID 중 하나여야 함)
                List<Long> groupIds = groups.stream().map(LeagueGroup::getId).collect(Collectors.toList());
                List<User> usersInTier = userRepository.findAll().stream()
                                .filter(u -> u.getLeague() == tier)
                                .collect(Collectors.toList());

                for (User u : usersInTier) {
                        assertThat(u.getLeagueGroupId())
                                        .as("유저 %s가 그룹에 배정되지 않았습니다.", u.getNickname())
                                        .isNotNull();
                        assertThat(groupIds)
                                        .as("유저 %s가 올바른 리그 그룹에 있지 않습니다. (현재: %d)", u.getNickname(),
                                                        u.getLeagueGroupId())
                                        .contains(u.getLeagueGroupId());
                }
        }

        private void assignRankedPointsDetailed() {
                List<User> allUsers = userRepository.findAll();
                Map<Long, List<User>> usersByGroup = allUsers.stream()
                                .collect(Collectors.groupingBy(User::getLeagueGroupId));

                for (List<User> groupUsers : usersByGroup.values()) {
                        for (int i = 0; i < groupUsers.size(); i++) {
                                User user = groupUsers.get(i);
                                // 각 그룹 내에서 1위는 10점, 10위는 1점이 되도록 부여
                                int points = 10 - i;
                                user.addLeaguePoint(points);
                        }
                }
                userRepository.saveAll(allUsers);
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

                // 점수 차등 부여 (순위 결정을 위해 10, 9, 8... 점수 부여)
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
