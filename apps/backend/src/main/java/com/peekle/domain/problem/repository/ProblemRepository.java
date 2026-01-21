package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Optional<Problem> findByExternalIdAndSource(String externalId, String source);
}
