package com.peekle.domain.study.service;

import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StudyMemberProgressService {

    private final StudyMemberRepository studyMemberRepository;
    private final StudyProblemRepository studyProblemRepository;

    @Transactional
    public void updateLastStudyProblem(Long studyId, Long userId, Long studyProblemId) {
        if (studyProblemId == null || studyProblemId <= 0) {
            return;
        }

        Optional<StudyMember> studyMemberOpt = studyMemberRepository.findByStudyAndUser_Id(
                StudyRoom.builder().id(studyId).build(),
                userId);
        if (studyMemberOpt.isEmpty()) {
            return;
        }

        Optional<StudyProblem> studyProblemOpt = studyProblemRepository.findById(studyProblemId);
        if (studyProblemOpt.isEmpty()) {
            return;
        }

        StudyProblem studyProblem = studyProblemOpt.get();
        if (studyProblem.getStudy() == null || !studyId.equals(studyProblem.getStudy().getId())) {
            return;
        }

        studyMemberOpt.get().updateLastStudyProblem(studyProblem);
    }

    @Transactional(readOnly = true)
    public Optional<Long> getLastStudyProblemId(Long studyId, Long userId) {
        return studyMemberRepository.findLastStudyProblemId(studyId, userId);
    }

    @Transactional(readOnly = true)
    public Optional<StudyProblem> getLastStudyProblem(Long studyId, Long userId) {
        return studyMemberRepository.findByStudyAndUser_Id(StudyRoom.builder().id(studyId).build(), userId)
                .map(StudyMember::getLastStudyProblem)
                .filter(studyProblem -> studyProblem != null
                        && studyProblem.getStudy() != null
                        && studyId.equals(studyProblem.getStudy().getId()));
    }
}
