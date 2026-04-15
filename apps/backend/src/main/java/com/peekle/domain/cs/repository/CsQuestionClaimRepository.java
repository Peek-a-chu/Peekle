package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionClaim;
import com.peekle.domain.cs.enums.CsQuestionClaimStatus;
import com.peekle.domain.cs.enums.CsQuestionClaimType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface CsQuestionClaimRepository extends JpaRepository<CsQuestionClaim, Long> {

    boolean existsByUser_IdAndQuestion_IdAndCreatedAtGreaterThanEqual(
            Long userId,
            Long questionId,
            LocalDateTime since);

    long countByUser_IdAndCreatedAtGreaterThanEqual(Long userId, LocalDateTime since);

    List<CsQuestionClaim> findByStage_IdOrderByCreatedAtDesc(Long stageId);

    @Query(
            value = """
                    select claim
                    from CsQuestionClaim claim
                    join fetch claim.question question
                    join fetch claim.stage stage
                    join fetch stage.track track
                    join fetch track.domain domain
                    where (:status is null or claim.status = :status)
                      and (:claimType is null or claim.claimType = :claimType)
                      and (:domainId is null or domain.id = :domainId)
                      and (:trackId is null or track.id = :trackId)
                      and (:stageId is null or stage.id = :stageId)
                      and (:questionId is null or question.id = :questionId)
                    order by claim.createdAt desc, claim.id desc
                    """,
            countQuery = """
                    select count(claim)
                    from CsQuestionClaim claim
                    join claim.question question
                    join claim.stage stage
                    join stage.track track
                    join track.domain domain
                    where (:status is null or claim.status = :status)
                      and (:claimType is null or claim.claimType = :claimType)
                      and (:domainId is null or domain.id = :domainId)
                      and (:trackId is null or track.id = :trackId)
                      and (:stageId is null or stage.id = :stageId)
                      and (:questionId is null or question.id = :questionId)
                    """)
    Page<CsQuestionClaim> findPagedByFilters(
            @Param("status") CsQuestionClaimStatus status,
            @Param("claimType") CsQuestionClaimType claimType,
            @Param("domainId") Integer domainId,
            @Param("trackId") Long trackId,
            @Param("stageId") Long stageId,
            @Param("questionId") Long questionId,
            Pageable pageable);
}
