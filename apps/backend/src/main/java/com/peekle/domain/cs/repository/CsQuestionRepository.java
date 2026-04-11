package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CsQuestionRepository extends JpaRepository<CsQuestion, Long> {
    List<CsQuestion> findByStage_IdAndIsActiveTrueOrderByIdAsc(Long stageId);
}
