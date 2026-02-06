package com.peekle.domain.league.repository;

import com.peekle.domain.league.entity.LeagueHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeagueHistoryRepository extends JpaRepository<LeagueHistory, Long> {
    List<LeagueHistory> findAllByUserIdOrderBySeasonWeekAsc(Long userId);

    List<LeagueHistory> findBySeasonWeek(int seasonWeek);

    Optional<LeagueHistory> findTopByUserIdAndIsViewedFalseOrderBySeasonWeekDesc(Long userId);

    @Modifying
    @Query("UPDATE LeagueHistory lh SET lh.isViewed = true WHERE lh.user.id = :userId AND lh.isViewed = false")
    void markAllAsViewedByUserId(@Param("userId") Long userId);

    @EntityGraph(attributePaths = { "user" })
    List<LeagueHistory> findAllByLeagueGroupIdAndSeasonWeekOrderByRankAsc(Long leagueGroupId, Integer seasonWeek);
}
