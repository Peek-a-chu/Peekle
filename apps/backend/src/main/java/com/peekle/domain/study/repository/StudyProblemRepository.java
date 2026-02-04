package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface StudyProblemRepository extends JpaRepository<StudyProblem, Long> {

    // 특정 월의 문제 목록 조회
    @Query("SELECT sp FROM StudyProblem sp WHERE sp.study.id = :studyId AND YEAR(sp.problemDate) = :year AND MONTH(sp.problemDate) = :month ORDER BY sp.problemDate ASC")
    List<StudyProblem> findByStudyIdAndYearMonth(@Param("studyId") Long studyId, @Param("year") int year,
            @Param("month") int month);

    // 특정 일자(Today)의 문제 목록 조회
    List<StudyProblem> findByStudyIdAndProblemDate(Long studyId, LocalDate problemDate);

    // 중복 등록 방지
    // 중복 등록 방지 (같은 날짜에 같은 문제 불가)
    boolean existsByStudyAndProblemIdAndProblemDate(StudyRoom study, Long problemId, LocalDate problemDate);
}
