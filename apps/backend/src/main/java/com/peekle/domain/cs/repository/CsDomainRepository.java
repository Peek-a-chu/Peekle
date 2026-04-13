package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsDomain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CsDomainRepository extends JpaRepository<CsDomain, Integer> {
    List<CsDomain> findAllByOrderByIdAsc();

    Optional<CsDomain> findTopByOrderByIdDesc();
}
