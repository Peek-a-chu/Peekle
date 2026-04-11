package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CsQuestionShortAnswerRepository extends JpaRepository<CsQuestionShortAnswer, Long> {
    List<CsQuestionShortAnswer> findByQuestion_IdOrderByIsPrimaryDescIdAsc(Long questionId);
}
