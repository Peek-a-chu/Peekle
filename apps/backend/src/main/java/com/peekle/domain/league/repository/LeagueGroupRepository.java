package com.peekle.domain.league.repository;

import com.peekle.domain.league.entity.LeagueGroup;
import com.peekle.domain.league.enums.LeagueTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeagueGroupRepository extends JpaRepository<LeagueGroup, Long> {
    Optional<LeagueGroup> findTopByTierAndSeasonWeekOrderByIdDesc(LeagueTier tier, int seasonWeek);

    java.util.List<LeagueGroup> findBySeasonWeek(int seasonWeek);

    @org.springframework.data.jpa.repository.Query("SELECT lg FROM LeagueGroup lg LEFT JOIN User u ON u.leagueGroupId = lg.id "
            +
            "WHERE lg.tier = :tier AND lg.seasonWeek = :seasonWeek " +
            "GROUP BY lg.id " +
            "HAVING COUNT(u.id) < 10 " +
            "ORDER BY lg.id ASC")
    java.util.List<LeagueGroup> findAvailableGroup(
            @org.springframework.data.repository.query.Param("tier") LeagueTier tier,
            @org.springframework.data.repository.query.Param("seasonWeek") int seasonWeek,
            org.springframework.data.domain.Pageable pageable);
}
