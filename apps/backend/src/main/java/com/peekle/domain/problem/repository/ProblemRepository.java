package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Optional<Problem> findByExternalIdAndSource(String externalId, String source);
    
    /**
     * title 또는 externalId로 문제 검색
     * @param query 검색어 (title 또는 externalId)
     * @param source 문제 출처 (기본값: BOJ)
     * @return 검색된 문제 목록
     */
    @Query("SELECT p FROM Problem p WHERE p.source = :source AND " +
           "(LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR p.externalId = :query)")
    List<Problem> searchByTitleOrExternalId(@Param("query") String query, @Param("source") String source);

    @Query("SELECT p FROM Problem p WHERE p.externalId LIKE %:keyword% OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Problem> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
