package com.peekle.domain.league.repository;

import com.peekle.domain.league.entity.LeagueHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeagueHistoryRepository extends JpaRepository<LeagueHistory, Long> {
    List<LeagueHistory> findAllByUserIdOrderBySeasonWeekAsc(Long userId);

    List<LeagueHistory> findBySeasonWeek(int seasonWeek);
}
