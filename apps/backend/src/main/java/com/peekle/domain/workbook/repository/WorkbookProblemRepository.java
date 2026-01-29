package com.peekle.domain.workbook.repository;

import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WorkbookProblemRepository extends JpaRepository<WorkbookProblem, Long> {

    @Query("SELECT wp FROM WorkbookProblem wp " +
           "JOIN FETCH wp.problem " +
           "WHERE wp.workbook = :workbook " +
           "ORDER BY wp.orderIndex ASC")
    List<WorkbookProblem> findByWorkbookWithProblem(@Param("workbook") Workbook workbook);

    void deleteByWorkbook(Workbook workbook);
}
