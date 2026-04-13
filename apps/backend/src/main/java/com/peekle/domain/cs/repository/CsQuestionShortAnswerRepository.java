package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CsQuestionShortAnswerRepository extends JpaRepository<CsQuestionShortAnswer, Long> {
    List<CsQuestionShortAnswer> findByQuestion_IdOrderByIsPrimaryDescIdAsc(Long questionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CsQuestionShortAnswer s where s.question.id = :questionId")
    void deleteByQuestionId(@Param("questionId") Long questionId);
}
