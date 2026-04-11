package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.entity.CsWrongProblemId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CsWrongProblemRepository extends JpaRepository<CsWrongProblem, CsWrongProblemId> {
    Optional<CsWrongProblem> findByUser_IdAndQuestion_Id(Long userId, Long questionId);
}
