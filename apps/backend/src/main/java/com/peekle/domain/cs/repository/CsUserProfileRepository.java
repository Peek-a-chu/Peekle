package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsUserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CsUserProfileRepository extends JpaRepository<CsUserProfile, Long> {
    @Query("select p from CsUserProfile p left join fetch p.currentDomain where p.userId = :userId")
    Optional<CsUserProfile> findByUserIdWithCurrentDomain(@Param("userId") Long userId);
}
