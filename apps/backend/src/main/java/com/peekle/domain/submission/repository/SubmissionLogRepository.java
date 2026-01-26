package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionLogRepository extends JpaRepository<SubmissionLog, Long>, SubmissionLogRepositoryCustom {

    // 특정 유저가 특정 문제에 대해 제출한 기록 개수 조회 (result 컬럼 없음 = 모두 성공)
    long countByUserIdAndProblemId(Long userId, Long problemId);

    // 스터디 내 특정 문제 풀이 기록 존재 여부 (삭제 시 체크)
    boolean existsByProblemIdAndRoomId(Long problemId, Long roomId);

    // 스터디 내 여러 문제에 대한 풀이 기록 조회 (현황 집계)
    List<SubmissionLog> findAllByRoomIdAndProblemIdIn(Long roomId, java.util.List<Long> problemIds);
}
