package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubmissionLogRepository extends JpaRepository<SubmissionLog, Long> {
    // 특정 유저가 특정 문제를 해결(SUCCESS)한 기록이 있는지 조회
    boolean existsByUserIdAndProblemIdAndResult(Long userId, Long problemId, String result);
    
    // 외래키 ID로 바로 조회할 경우 (필요시)
    // boolean existsByUserIdAndProblemId(Long userId, Long problemId);
}
