package com.peekle.domain.user.repository;

import com.peekle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByNickname(String nickname);

    // 랭킹 계산용: 내 점수보다 높은 사람 수 (같은 그룹 내)
    long countByLeagueGroupIdAndLeaguePointGreaterThan(Long leagueGroupId, int leaguePoint);
    
    // 전체 랭킹 (그룹 없을 때)
    long countByLeaguePointGreaterThan(int leaguePoint);
}
