package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CsQuestionRepository extends JpaRepository<CsQuestion, Long> {
    List<CsQuestion> findByStage_IdAndIsActiveTrueOrderByIdAsc(Long stageId);

    Optional<CsQuestion> findByIdAndStage_Id(Long questionId, Long stageId);

    Optional<CsQuestion> findByIdAndIsActiveTrue(Long questionId);

    @Query("""
            select q.stage.id as stageId, count(q.id) as questionCount
            from CsQuestion q
            where q.stage.id in :stageIds
              and q.isActive = true
            group by q.stage.id
            """)
    List<StageQuestionCountProjection> countActiveQuestionsByStageIds(@Param("stageIds") List<Long> stageIds);

    interface StageQuestionCountProjection {
        Long getStageId();

        Long getQuestionCount();
    }
}
