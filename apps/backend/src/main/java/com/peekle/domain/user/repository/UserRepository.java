package com.peekle.domain.user.repository;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom {
    Optional<User> findByNickname(String nickname);

    Optional<User> findBySocialIdAndProvider(String socialId, String provider);

    Optional<User> findByBojId(String bojId);

    // 랭킹 계산용: 내 점수보다 높은 사람 수 (같은 그룹 내)
    int countByLeagueGroupId(Long leagueGroupId);

    long countByLeague(LeagueTier league);

    // 기존: 점수만 비교
    // long countByLeagueGroupIdAndLeaguePointGreaterThan(Long leagueGroupId,
    // Integer leaguePoint);
    // 변경: 점수 > 내점수 OR (점수 == 내점수 AND 업데이트 < 내업데이트)
    @Query("SELECT COUNT(u) FROM User u WHERE u.leagueGroupId = :leagueGroupId AND (u.leaguePoint > :point OR (u.leaguePoint = :point AND u.updatedAt < :updatedAt))")
    long countRankByLeagueGroupId(@org.springframework.data.repository.query.Param("leagueGroupId") Long leagueGroupId,
            @org.springframework.data.repository.query.Param("point") Integer point,
            @org.springframework.data.repository.query.Param("updatedAt") java.time.LocalDateTime updatedAt);

    // TODO: 리그 만들면 그룹 랭킹으로 해야해용
    // 전체 랭킹 (그룹 없을 때)
    // long countByLeaguePointGreaterThan(int leaguePoint);
    @Query("SELECT COUNT(u) FROM User u WHERE (u.leaguePoint > :point OR (u.leaguePoint = :point AND u.updatedAt < :updatedAt))")
    long countRankGlobal(@org.springframework.data.repository.query.Param("point") Integer point,
            @org.springframework.data.repository.query.Param("updatedAt") java.time.LocalDateTime updatedAt);

    // 랭킹 리스트 조회
    // java.util.List<User> findTop100ByLeagueGroupIdOrderByLeaguePointDesc(Long
    // leagueGroupId);
    java.util.List<User> findTop100ByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(Long leagueGroupId);

    // java.util.List<User> findTop100ByLeagueOrderByLeaguePointDesc(LeagueTier
    // league);
    java.util.List<User> findTop100ByLeagueOrderByLeaguePointDescUpdatedAtAsc(LeagueTier league);

    Optional<User> findByExtensionToken(String token);

    // Season management
    // java.util.List<User> findByLeagueGroupIdOrderByLeaguePointDesc(Long
    // leagueGroupId);
    java.util.List<User> findByLeagueGroupIdOrderByLeaguePointDescUpdatedAtAsc(Long leagueGroupId);

    // AI 추천용 활성 유저 조회
    @Query("SELECT u FROM User u WHERE u.isDeleted = false")
    java.util.List<User> findAllActiveUsers();

    java.util.List<User> findByLeagueAndLeagueGroupIdIsNull(LeagueTier tier);

    Page<User> findByNicknameContainingIgnoreCase(String keyword, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE User u SET u.streakCurrent = 0 WHERE u.streakCurrent > 0 AND (u.lastSolvedDate < :yesterday OR u.lastSolvedDate IS NULL)")
    void resetBrokenStreaks(
            @org.springframework.data.repository.query.Param("yesterday") java.time.LocalDate yesterday);
}
