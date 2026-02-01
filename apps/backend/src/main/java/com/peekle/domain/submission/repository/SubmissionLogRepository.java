package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SubmissionLogRepository extends JpaRepository<SubmissionLog, Long>, SubmissionLogRepositoryCustom {

        // 특정 유저가 특정 문제에 대해 제출한 기록 개수 조회 (result 컬럼 없음 = 모두 성공)
        long countByUserIdAndProblemId(Long userId, Long problemId);

    // 유저가 푼 문제 ID 목록을 한 번에 조회 (N+1 방지)
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s.problem.id FROM SubmissionLog s WHERE s.user.id = :userId AND s.problem.id IN :problemIds")
    List<Long> findSolvedProblemIds(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("problemIds") List<Long> problemIds);

    // 특정 유저의 총 해결 문제 수 조회 (중복 제거)
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT s.problem.id) FROM SubmissionLog s WHERE s.user.id = :userId")
    long countByUserId(Long userId);

        // 스터디 내 특정 문제 풀이 기록 존재 여부 (삭제 시 체크)
        boolean existsByProblemIdAndRoomId(Long problemId, Long roomId);

        // 스터디 내 여러 문제에 대한 풀이 기록 조회 (현황 집계)
        List<SubmissionLog> findAllByRoomIdAndProblemIdIn(Long roomId, List<Long> problemIds);

    // [New] 특정 스터디, 특정 문제에 대해 각 유저별 최신 성공 풀이 조회
    // SourceType이나 Success 여부를 걸러야 한다면 조건 추가 (여기선 모든 log가 성공 가정 혹은 score 체크)
    // 현재 구조상 SubmissionLog에 'success' 필드가 없지만, 생성 시 검증된 것만 저장된다면 모두 성공임.
    // 최신 순으로 정렬 후 유저별로 하나씩... JPQL이나 Java Stream 처리 필요.
    // 여기선 해당 방 + 문제의 모든 로그를 가져와서 Service에서 최신것만 필터링하는 것이 간단할 수 있음.
    // 데이터가 많지 않다고 가정.
    // [New] 특정 스터디, 특정 문제에 대해 각 유저별 최신 성공 풀이 조회
    List<SubmissionLog> findAllByRoomIdAndProblemIdOrderBySubmittedAtDesc(Long roomId, Long problemId);

    // 유저의 모든 제출 기록 조회 (스트릭 계산용, 오래된 순)
    List<SubmissionLog> findAllByUserIdOrderBySubmittedAtAsc(Long userId);

    // [New] 특정 유저의 특정 일자(범위) 제출 기록 조회
    List<SubmissionLog> findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(
            Long userId,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end
    );

    // [New] 유저의 전체 제출 기록 조회 (페이징)
    Page<SubmissionLog> findAllByUserIdOrderBySubmittedAtDesc(Long userId, Pageable pageable);
}
