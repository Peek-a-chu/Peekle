package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsDomainTrack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CsDomainTrackRepository extends JpaRepository<CsDomainTrack, Long> {
    Optional<CsDomainTrack> findByDomain_IdAndTrackNo(Integer domainId, Short trackNo);
}
