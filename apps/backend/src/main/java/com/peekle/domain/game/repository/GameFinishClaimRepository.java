package com.peekle.domain.game.repository;

import com.peekle.domain.game.entity.GameFinishClaim;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameFinishClaimRepository extends JpaRepository<GameFinishClaim, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from GameFinishClaim c where c.roomId = :roomId")
    Optional<GameFinishClaim> findByRoomIdForUpdate(@Param("roomId") Long roomId);
}
