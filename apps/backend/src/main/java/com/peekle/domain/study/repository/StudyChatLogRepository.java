package com.peekle.domain.study.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.peekle.domain.study.entity.StudyChatLog;

public interface StudyChatLogRepository extends JpaRepository<StudyChatLog, Long> {

}
