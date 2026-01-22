package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionLogRepository extends JpaRepository<SubmissionLog, Long> {
    
    // 특정 유저가 특정 문제에 대해 제출한 기록 개수 조회 (result 컬럼 없음 = 모두 성공)
    long countByUserIdAndProblemId(Long userId, Long problemId);
}
