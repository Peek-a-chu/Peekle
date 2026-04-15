package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionClaim;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CsQuestionClaimRepository extends JpaRepository<CsQuestionClaim, Long> {

    boolean existsByUser_IdAndQuestion_IdAndCreatedAtGreaterThanEqual(
            Long userId,
            Long questionId,
            LocalDateTime since);

    long countByUser_IdAndCreatedAtGreaterThanEqual(Long userId, LocalDateTime since);

    List<CsQuestionClaim> findByStage_IdOrderByCreatedAtDesc(Long stageId);
}
