package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestionChoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CsQuestionChoiceRepository extends JpaRepository<CsQuestionChoice, Long> {
    List<CsQuestionChoice> findByQuestion_IdOrderByChoiceNoAsc(Long questionId);
}
