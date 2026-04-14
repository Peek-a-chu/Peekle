package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsUserDomainProgress;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CsUserDomainProgressRepository extends JpaRepository<CsUserDomainProgress, Long> {
    @EntityGraph(attributePaths = "domain")
    List<CsUserDomainProgress> findByUser_Id(Long userId);

    @EntityGraph(attributePaths = "domain")
    List<CsUserDomainProgress> findByUser_IdOrderByUpdatedAtDesc(Long userId);

    @EntityGraph(attributePaths = "domain")
    Optional<CsUserDomainProgress> findByUser_IdAndDomain_Id(Long userId, Integer domainId);

    @EntityGraph(attributePaths = "domain")
    List<CsUserDomainProgress> findByDomain_Id(Integer domainId);

    @EntityGraph(attributePaths = "domain")
    List<CsUserDomainProgress> findByDomain_IdAndCurrentTrackNo(Integer domainId, Short currentTrackNo);
}
