package com.peekle.domain.ai.repository;

import com.peekle.domain.ai.entity.RecommendProblem;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecommendProblemRepository extends JpaRepository<RecommendProblem, Long> {
    List<RecommendProblem> findAllByUserIdOrderByOrderIndexAsc(Long userId);

    void deleteAllByUserId(Long userId);

    long countByUserIdAndSolvedTrue(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RecommendProblem r SET r.solved = TRUE WHERE r.user.id = :userId AND r.problem.id = :problemId")
    int markSolved(
            @Param("userId") Long userId,
            @Param("problemId") Long problemId
    );
}
