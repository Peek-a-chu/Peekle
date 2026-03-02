package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.request.TestcaseSaveRequest;
import com.peekle.domain.study.dto.response.TestcaseResponse;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.entity.Testcase;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.study.repository.TestcaseRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TestcaseService {

        private final TestcaseRepository testcaseRepository;
        private final StudyRoomRepository studyRoomRepository;
        private final StudyProblemRepository studyProblemRepository;

        public List<TestcaseResponse> getTestcases(Long roomId, Long problemId) {
                List<Testcase> testcases = testcaseRepository.findAllByStudyRoomIdAndStudyProblemId(roomId, problemId);
                return testcases.stream()
                                .map(TestcaseResponse::from)
                                .collect(Collectors.toList());
        }

        @Transactional
        public void saveTestcases(Long roomId, Long problemId, List<TestcaseSaveRequest> requests) {
                StudyRoom studyRoom = studyRoomRepository.findById(roomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                StudyProblem studyProblem = studyProblemRepository.findById(problemId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_PROBLEM_NOT_FOUND));

                // Delete existing testcases for this problem in this room
                testcaseRepository.deleteAllByStudyRoomIdAndStudyProblemId(roomId, problemId);

                // Save new testcases
                if (requests != null && !requests.isEmpty()) {
                        List<Testcase> testcases = requests.stream()
                                        .map(req -> Testcase.builder()
                                                        .studyRoom(studyRoom)
                                                        .studyProblem(studyProblem)
                                                        .input(req.getInput())
                                                        .expectedOutput(req.getExpectedOutput())
                                                        .build())
                                        .collect(Collectors.toList());
                        testcaseRepository.saveAll(testcases);
                }
        }
}
