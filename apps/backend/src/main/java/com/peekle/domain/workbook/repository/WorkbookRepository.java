package com.peekle.domain.workbook.repository;

import com.peekle.domain.workbook.entity.Workbook;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkbookRepository extends JpaRepository<Workbook, Long>, WorkbookRepositoryCustom {

    // 탭별 개수 조회
    @Query("SELECT COUNT(w) FROM Workbook w WHERE w.isActive = true")
    long countAllActive();

    @Query("SELECT COUNT(w) FROM Workbook w WHERE w.isActive = true AND w.creator.id = :userId")
    long countMyWorkbooks(@Param("userId") Long userId);

    @Query("SELECT COUNT(w) FROM Workbook w " +
           "JOIN WorkbookBookmark b ON b.workbook = w " +
           "WHERE w.isActive = true AND b.user.id = :userId")
    long countBookmarkedWorkbooks(@Param("userId") Long userId);
}
