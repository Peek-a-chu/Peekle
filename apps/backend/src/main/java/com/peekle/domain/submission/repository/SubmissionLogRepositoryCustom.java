package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import java.util.List;

public interface SubmissionLogRepositoryCustom {
    // 특정 스터디, 특정 문제에 대해 유저별 '최신' 제출 내역만 조회 (DB 레벨 필터링)
    List<SubmissionLog> findLatestLogsPerUser(Long roomId, Long problemId);
}
