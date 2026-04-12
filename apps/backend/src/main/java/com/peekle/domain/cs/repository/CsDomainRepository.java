package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsDomain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CsDomainRepository extends JpaRepository<CsDomain, Integer> {
    List<CsDomain> findAllByOrderByIdAsc();
}
