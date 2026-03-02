package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.Testcase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestcaseRepository extends JpaRepository<Testcase, Long> {
    List<Testcase> findAllByStudyRoomIdAndStudyProblemId(Long studyRoomId, Long studyProblemId);

    void deleteAllByStudyRoomIdAndStudyProblemId(Long studyRoomId, Long studyProblemId);
}
