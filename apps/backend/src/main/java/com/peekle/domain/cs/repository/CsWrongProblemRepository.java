package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.entity.CsWrongProblemId;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CsWrongProblemRepository extends JpaRepository<CsWrongProblem, CsWrongProblemId> {
    Optional<CsWrongProblem> findByUser_IdAndQuestion_Id(Long userId, Long questionId);

    @Query(
            value = """
                    select wp
                    from CsWrongProblem wp
                    join fetch wp.question q
                    join fetch q.stage s
                    join fetch s.track t
                    join fetch t.domain d
                    where wp.user.id = :userId
                      and q.isActive = true
                      and (:status is null or wp.status = :status)
                      and (:domainId is null or d.id = :domainId)
                      and (:stageId is null or s.id = :stageId)
                    order by wp.lastWrongAt desc, q.id asc
                    """,
            countQuery = """
                    select count(wp)
                    from CsWrongProblem wp
                    join wp.question q
                    join q.stage s
                    join s.track t
                    join t.domain d
                    where wp.user.id = :userId
                      and q.isActive = true
                      and (:status is null or wp.status = :status)
                      and (:domainId is null or d.id = :domainId)
                      and (:stageId is null or s.id = :stageId)
                    """)
    org.springframework.data.domain.Page<CsWrongProblem> findPagedByUserAndFilters(
            @Param("userId") Long userId,
            @Param("status") CsWrongProblemStatus status,
            @Param("domainId") Integer domainId,
            @Param("stageId") Long stageId,
            org.springframework.data.domain.Pageable pageable);

    @Query("""
            select wp
            from CsWrongProblem wp
            join fetch wp.question q
            join fetch q.stage s
            join fetch s.track t
            join fetch t.domain d
            where wp.user.id = :userId
              and q.isActive = true
              and wp.status = :status
              and (:domainId is null or d.id = :domainId)
              and (:stageId is null or s.id = :stageId)
            order by wp.lastWrongAt desc, q.id asc
            """)
    List<CsWrongProblem> findCandidatesForReview(
            @Param("userId") Long userId,
            @Param("status") CsWrongProblemStatus status,
            @Param("domainId") Integer domainId,
            @Param("stageId") Long stageId);

    @Query("""
            select count(wp)
            from CsWrongProblem wp
            where wp.user.id = :userId
              and wp.status = :status
              and wp.question.id in :questionIds
            """)
    long countByUserAndStatusAndQuestionIds(
            @Param("userId") Long userId,
            @Param("status") CsWrongProblemStatus status,
            @Param("questionIds") List<Long> questionIds);
}
