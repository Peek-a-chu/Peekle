package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CsStageRepository extends JpaRepository<CsStage, Long> {
    @Query("""
            select s
            from CsStage s
            join fetch s.track t
            join fetch t.domain
            where s.id = :stageId
            """)
    Optional<CsStage> findByIdWithTrackAndDomain(@Param("stageId") Long stageId);

    List<CsStage> findByTrack_IdOrderByStageNoAsc(Long trackId);

    Optional<CsStage> findByTrack_IdAndStageNo(Long trackId, Short stageNo);
}
