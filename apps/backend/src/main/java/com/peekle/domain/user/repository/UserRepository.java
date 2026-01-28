package com.peekle.domain.user.repository;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByNickname(String nickname);

    Optional<User> findBySocialIdAndProvider(String socialId, String provider);

    // 랭킹 계산용: 내 점수보다 높은 사람 수 (같은 그룹 내)
    int countByLeagueGroupId(Long leagueGroupId);
    long countByLeague(LeagueTier league);

    long countByLeagueGroupIdAndLeaguePointGreaterThan(Long leagueGroupId, Integer leaguePoint);
    //TODO: 리그 만들면 그룹 랭킹으로 해야해용
    // 전체 랭킹 (그룹 없을 때)
    long countByLeaguePointGreaterThan(int leaguePoint);

    // 랭킹 리스트 조회
    java.util.List<User> findTop100ByLeagueGroupIdOrderByLeaguePointDesc(Long leagueGroupId);
    java.util.List<User> findTop100ByLeagueOrderByLeaguePointDesc(LeagueTier league);

    Optional<User> findByExtensionToken(String token);
}
