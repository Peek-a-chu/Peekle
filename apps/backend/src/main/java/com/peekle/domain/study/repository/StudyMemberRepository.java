package com.peekle.domain.study.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.peekle.domain.study.entity.StudyMember;

import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.user.entity.User;

public interface StudyMemberRepository extends JpaRepository<StudyMember, Long> {
    boolean existsByStudyAndUser(StudyRoom study, User user);
}
