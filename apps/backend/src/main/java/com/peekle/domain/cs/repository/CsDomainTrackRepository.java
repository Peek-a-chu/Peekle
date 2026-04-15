package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CsDomainTrackRepository extends JpaRepository<CsDomainTrack, Long> {
    Optional<CsDomainTrack> findByDomain_IdAndTrackNo(Integer domainId, Short trackNo);

    List<CsDomainTrack> findByDomain_IdOrderByTrackNoAsc(Integer domainId);

    Optional<CsDomainTrack> findTopByDomain_IdOrderByTrackNoDesc(Integer domainId);

    List<CsDomainTrack> findByLearningModeAndExamYearBetweenOrderByExamYearAscTrackNoAsc(
            CsTrackLearningMode learningMode,
            Short startYear,
            Short endYear);

    List<CsDomainTrack> findByDomain_IdAndLearningModeAndExamYearBetweenOrderByExamYearAscTrackNoAsc(
            Integer domainId,
            CsTrackLearningMode learningMode,
            Short startYear,
            Short endYear);

    List<CsDomainTrack> findByLearningModeAndExamYearOrderByTrackNoAsc(
            CsTrackLearningMode learningMode,
            Short examYear);

    List<CsDomainTrack> findByDomain_IdAndLearningModeAndExamYearOrderByTrackNoAsc(
            Integer domainId,
            CsTrackLearningMode learningMode,
            Short examYear);
}
