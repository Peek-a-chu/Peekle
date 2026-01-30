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

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class LeagueSmallGroupTest {

    @Autowired
    private LeagueService leagueService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LeagueGroupRepository leagueGroupRepository;

    @Autowired
    private LeagueHistoryRepository leagueHistoryRepository;

    private int currentSeasonWeek;

    @BeforeEach
    void setUp() {
        leagueHistoryRepository.deleteAll();
        leagueGroupRepository.deleteAll();
        userRepository.deleteAll();

        // 현재 시즌 week 계산
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        java.time.temporal.WeekFields weekFields = java.time.temporal.WeekFields.ISO;
        currentSeasonWeek = now.getYear() * 100 + now.get(weekFields.weekOfWeekBasedYear());
    }

    @Test
    @DisplayName("3명 이하 그룹: 히스토리 기록 없이 스킵, 다음 주 재배정 대기")
    void testSmallGroup_3OrLess_SkipCompetition() {
        // Given: 3명 그룹
        createGroupWithUsers(LeagueTier.SILVER, 3);

        // When: 시즌 종료
        leagueService.closeSeason();

        // Then: 히스토리가 생성되지 않음
        List<com.peekle.domain.league.entity.LeagueHistory> histories = leagueHistoryRepository.findAll();
        assertThat(histories).isEmpty();

        // Then: 유저들의 그룹이 해제됨
        List<User> users = userRepository.findAll();
        assertThat(users).hasSize(3);
        for (User user : users) {
            assertThat(user.getLeagueGroupId()).isNull();
            assertThat(user.getLeague()).isEqualTo(LeagueTier.SILVER); // 티어는 유지
        }
    }

    @Test
    @DisplayName("4명 그룹: 1명 승급, 1명 강등")
    void testSmallGroup_4Members_1UpAnd1Down() {
        // Given: 4명 그룹
        createGroupWithUsers(LeagueTier.SILVER, 4);
        assignRankedPoints();

        // When: 시즌 종료 및 시작
        leagueService.closeSeason();
        leagueService.startNewSeason();

        // Then: 1명 골드 승급, 2명 실버 유지, 1명 브론즈 강등
        List<User> users = userRepository.findAll();
        long goldCount = users.stream().filter(u -> u.getLeague() == LeagueTier.GOLD).count();
        long silverCount = users.stream().filter(u -> u.getLeague() == LeagueTier.SILVER).count();
        long bronzeCount = users.stream().filter(u -> u.getLeague() == LeagueTier.BRONZE).count();

        assertThat(goldCount).isEqualTo(1);
        assertThat(silverCount).isEqualTo(2);
        assertThat(bronzeCount).isEqualTo(1);
    }

    @Test
    @DisplayName("7명 그룹: 2명 승급, 2명 강등")
    void testSmallGroup_7Members_2UpAnd2Down() {
        // Given: 7명 그룹
        createGroupWithUsers(LeagueTier.SILVER, 7);
        assignRankedPoints();

        // When
        leagueService.closeSeason();
        leagueService.startNewSeason();

        // Then: 2명 골드, 3명 실버, 2명 브론즈
        List<User> users = userRepository.findAll();
        long goldCount = users.stream().filter(u -> u.getLeague() == LeagueTier.GOLD).count();
        long silverCount = users.stream().filter(u -> u.getLeague() == LeagueTier.SILVER).count();
        long bronzeCount = users.stream().filter(u -> u.getLeague() == LeagueTier.BRONZE).count();

        assertThat(goldCount).isEqualTo(2);
        assertThat(silverCount).isEqualTo(3);
        assertThat(bronzeCount).isEqualTo(2);
    }

    @Test
    @DisplayName("startNewSeason: 4명 미만 티어는 그룹 생성 안 함")
    void testStartNewSeason_LessThan4Users_NoGroupCreated() {
        // Given: 실버 3명 (그룹 없음)
        for (int i = 0; i < 3; i++) {
            User user = User.builder()
                    .socialId("silver_user_" + i)
                    .provider("TEST")
                    .nickname("silver_" + i)
                    .bojId("boj_silver_" + i)
                    .league(LeagueTier.SILVER)
                    .leagueGroupId(null)
                    .leaguePoint(0)
                    .build();
            userRepository.save(user);
        }

        // When: 새 시즌 시작
        leagueService.startNewSeason();

        // Then: 실버 그룹이 생성되지 않음 (3명이므로)
        int nextSeasonWeek = currentSeasonWeek + 1;
        List<LeagueGroup> allGroups = leagueGroupRepository.findBySeasonWeek(nextSeasonWeek);
        long silverGroupCount = allGroups.stream()
                .filter(g -> g.getTier() == LeagueTier.SILVER)
                .count();
        assertThat(silverGroupCount).isZero();

        // Then: 유저들은 여전히 그룹 없음
        List<User> users = userRepository.findAll();
        for (User user : users) {
            assertThat(user.getLeagueGroupId()).isNull();
        }
    }

    private void createGroupWithUsers(LeagueTier tier, int userCount) {
        LeagueGroup group = LeagueGroup.builder()
                .tier(tier)
                .seasonWeek(currentSeasonWeek)
                .build();
        leagueGroupRepository.save(group);

        for (int i = 0; i < userCount; i++) {
            User user = User.builder()
                    .socialId(tier.name().toLowerCase() + "_user_" + i)
                    .provider("TEST")
                    .nickname(tier.name().toLowerCase() + "_nick_" + i)
                    .bojId("boj_" + tier.name().toLowerCase() + "_" + i)
                    .league(tier)
                    .leagueGroupId(group.getId())
                    .leaguePoint(0)
                    .build();
            userRepository.save(user);
        }
    }

    private void assignRankedPoints() {
        List<User> allUsers = userRepository.findAll();
        for (int i = 0; i < allUsers.size(); i++) {
            User user = allUsers.get(i);
            int points = 1000 - (i * 10); // 상위권일수록 높은 점수
            user.addLeaguePoint(points);
        }
        userRepository.saveAll(allUsers);
    }
}
