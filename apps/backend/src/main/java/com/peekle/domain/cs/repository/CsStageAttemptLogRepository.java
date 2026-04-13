package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsStageAttemptLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CsStageAttemptLogRepository extends JpaRepository<CsStageAttemptLog, Long> {

    @Query("""
            SELECT log
            FROM CsStageAttemptLog log
            JOIN FETCH log.domain d
            WHERE log.user.id = :userId
              AND log.completedAt >= :start
              AND log.completedAt < :end
              AND log.isReview = false
            ORDER BY log.completedAt DESC
            """)
    List<CsStageAttemptLog> findMainLearningTimeline(
            @Param("userId") Long userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
