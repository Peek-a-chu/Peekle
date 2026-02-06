package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProblemRepositoryCustom {

    Page<Problem> searchProblems(String keyword, List<String> tiers, List<String> tags, Pageable pageable);
}
