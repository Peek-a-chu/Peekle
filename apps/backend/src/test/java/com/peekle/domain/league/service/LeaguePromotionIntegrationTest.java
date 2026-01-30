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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    @BeforeEach
    void setUp() {
        // Clean up
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
                User user = User.builder()
                        .socialId(tier.name().toLowerCase() + "_user_" + g + "_" + u)
                        .provider("TEST")
                        .nickname(tier.name().toLowerCase() + "_nick_" + g + "_" + u)
                        .bojId("boj_" + tier.name().toLowerCase() + "_" + g + "_" + u)
                        .league(tier)
                        .leagueGroupId(group.getId())
                        .leaguePoint(0)
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
}
