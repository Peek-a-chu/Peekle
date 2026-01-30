package com.peekle.domain.point.repository;

import com.peekle.domain.point.entity.PointLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface PointLogRepository extends JpaRepository<PointLog, Long> {
    List<PointLog> findAllByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            Long userId,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end
    );
}
