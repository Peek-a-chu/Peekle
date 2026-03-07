package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyProblemDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudyProblemDraftRepository extends JpaRepository<StudyProblemDraft, Long> {
    Optional<StudyProblemDraft> findByStudyMemberAndStudyProblem(StudyMember studyMember, StudyProblem studyProblem);
}
