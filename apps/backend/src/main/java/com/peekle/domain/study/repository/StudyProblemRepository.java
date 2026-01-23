package com.peekle.domain.study.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.peekle.domain.study.entity.StudyProblem;

public interface StudyProblemRepository extends JpaRepository<StudyProblem, Long> {

}
