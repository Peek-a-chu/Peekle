package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SubmissionLogRepositoryCustom {
    // 유저별 최신 제출 내역 조회 (Pagination 지원)
    Page<SubmissionLog> findLatestSubmissionsByRoomIdAndProblemId(
            Long roomId, Long problemId, Pageable pageable);
}
