package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long>, ProblemRepositoryCustom {
    Optional<Problem> findByExternalIdAndSource(String externalId, String source);

    @Query("SELECT p FROM Problem p WHERE p.externalId LIKE %:keyword% OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Problem> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
