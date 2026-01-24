package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyChatLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudyChatRepository extends JpaRepository<StudyChatLog, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "user" })
    Page<StudyChatLog> findAllByStudyIdOrderByCreatedAtDesc(Long studyId, Pageable pageable);
}
