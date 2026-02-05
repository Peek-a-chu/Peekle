package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long>, ProblemRepositoryCustom {
       Optional<Problem> findByExternalIdAndSource(String externalId, String source);

       /**
        * title 또는 externalId로 문제 검색
        * 
        * @param query  검색어 (title 또는 externalId)
        * @param source 문제 출처 (기본값: BOJ)
        * @return 검색된 문제 목록
        */
       @Query("SELECT p FROM Problem p WHERE p.source = :source AND " +
                     "(LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR p.externalId = :query)")
       List<Problem> searchByTitleOrExternalId(@Param("query") String query, @Param("source") String source);

       @Query("SELECT p FROM Problem p WHERE p.externalId LIKE %:keyword% OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
       Page<Problem> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

       @Query("SELECT DISTINCT p FROM Problem p " +
                     "LEFT JOIN p.tags t " +
                     "WHERE (:keyword IS NULL OR :keyword = '' OR p.externalId LIKE %:keyword% OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
                     +
                     "AND (:tiers IS NULL OR p.tier IN :tiers) " +
                     "AND (:tagNames IS NULL OR t.name IN :tagNames)")
       Page<Problem> searchByFilter(
                     @Param("keyword") String keyword,
                     @Param("tiers") List<String> tiers,
                     @Param("tagNames") List<String> tagNames,
                     Pageable pageable);

       /**
        * 특정 레벨 범위 내에서 무작위로 N개의 문제를 가져옵니다.
        * MySQL의 ORDER BY RAND()를 사용합니다.
        */
       @Query(nativeQuery = true, value = "SELECT id, source, external_id, title, tier, url FROM problems p " +
                     "WHERE p.source = 'BOJ' " +
                     "AND p.tier IN :tiers " +
                     "AND p.title REGEXP '[ㄱ-ㅎㅏ-ㅣ가-힣]' " +
                     "ORDER BY RAND() LIMIT :limit")
       List<Problem> findRandomProblemsByTiers(@Param("tiers") List<String> tiers, @Param("limit") int limit);

       @Query(nativeQuery = true, value = "SELECT p.id, p.source, p.external_id, p.title, p.tier, p.url FROM problems p "
                     +
                     "WHERE p.source = 'BOJ' " +
                     "AND p.tier IN :tiers " +
                     "AND p.title REGEXP '[ㄱ-ㅎㅏ-ㅣ가-힣]' " +
                     "AND EXISTS (" +
                     "    SELECT 1 FROM problem_tags pt " +
                     "    JOIN tags t ON pt.tag_id = t.id " +
                     "    WHERE pt.problem_id = p.id " +
                     "    AND t.tag_key IN :tags" +
                     ") " +
                     "ORDER BY RAND() LIMIT :limit")
       List<Problem> findRandomProblemsByTiersAndTags(@Param("tiers") List<String> tiers,
                     @Param("tags") List<String> tags, @Param("limit") int limit);
}
