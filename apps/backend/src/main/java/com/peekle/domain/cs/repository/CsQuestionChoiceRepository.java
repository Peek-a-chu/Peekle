package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionChoice;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CsQuestionChoiceRepository extends JpaRepository<CsQuestionChoice, Long> {
    List<CsQuestionChoice> findByQuestion_IdOrderByChoiceNoAsc(Long questionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CsQuestionChoice c where c.question.id = :questionId")
    void deleteByQuestionId(@Param("questionId") Long questionId);
}
