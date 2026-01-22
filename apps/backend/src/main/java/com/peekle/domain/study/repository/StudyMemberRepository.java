package com.peekle.domain.study.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.peekle.domain.study.entity.StudyMember;

import com.peekle.domain.study.entity.StudyRoom;

public interface StudyMemberRepository extends JpaRepository<StudyMember, Long> {
    boolean existsByStudyAndUserId(StudyRoom study, Long userId);
}
