package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CsQuestionRepository extends JpaRepository<CsQuestion, Long> {
    List<CsQuestion> findByStage_IdAndIsActiveTrueOrderByIdAsc(Long stageId);

    Optional<CsQuestion> findByIdAndStage_Id(Long questionId, Long stageId);
}
