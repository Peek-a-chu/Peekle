package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudyMemberRepository extends JpaRepository<StudyMember, Long> {
    boolean existsByStudyAndUser_Id(StudyRoom study, Long userId);

    boolean existsByUser_Id(Long userId);

    Optional<StudyMember> findByStudyAndUser_Id(StudyRoom study, Long userId);

    List<StudyMember> findAllByStudyIdIn(List<Long> studyRoomIds);

    List<StudyMember> findAllByStudy(StudyRoom study);

    void deleteByStudy(StudyRoom study);
}
