package com.peekle.domain.league.repository;

import com.peekle.domain.league.entity.LeagueGroup;
import com.peekle.domain.league.enums.LeagueTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeagueGroupRepository extends JpaRepository<LeagueGroup, Long> {
    Optional<LeagueGroup> findTopByTierAndSeasonWeekOrderByIdDesc(LeagueTier tier, int seasonWeek);

    java.util.List<LeagueGroup> findBySeasonWeek(int seasonWeek);
}
