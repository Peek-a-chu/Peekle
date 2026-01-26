package com.peekle.domain.study.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.dto.curriculum.StudyProblemAddRequest;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyCurriculumService {

    private final StudyProblemRepository studyProblemRepository;
    private final StudyRoomRepository studyRoomRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final StudyMemberRepository studyMemberRepository;
    private final SubmissionLogRepository submissionLogRepository;
    private final RedisPublisher redisPublisher;

    /**
     * 커리큘럼에 문제 추가 (오늘 날짜만 가능)
     */
    @Transactional
    public void addProblem(Long userId, Long studyId, StudyProblemAddRequest request) {
        StudyRoom study = studyRoomRepository.findById(studyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 제약사항 1: 문제 날짜는 오늘이어야 함
        LocalDate targetDate = (request.getProblemDate() != null) ? request.getProblemDate() : LocalDate.now();
        if (!targetDate.equals(LocalDate.now())) {
            throw new BusinessException(ErrorCode.PROBLEM_DATE_MISMATCH);
        }

        // 제약사항 2: 중복 확인
        if (studyProblemRepository.existsByStudyAndProblemId(study, request.getProblemId())) {
            throw new BusinessException(ErrorCode.PROBLEM_ALREADY_ADDED);
        }

        StudyProblem studyProblem = StudyProblem.builder()
                .study(study)
                .problemId(request.getProblemId())
                .problemDate(targetDate)
                .createdBy(user)
                .build();

        studyProblemRepository.save(studyProblem);

        // 웹소켓을 통해 알림
        Problem problem = problemRepository.findById(request.getProblemId()).orElse(null);
        String title = (problem != null) ? problem.getTitle() : "Unknown";
        String tier = (problem != null) ? problem.getTier() : "Unrated";

        ProblemStatusResponse responseData = ProblemStatusResponse.builder()
                .problemId(request.getProblemId())
                .title(title)
                .tier(tier)
                .assignedDate(targetDate)
                .solvedMemberCount(0)
                .totalMemberCount(studyMemberRepository.countByStudy_Id(studyId))
                .isSolvedByMe(false)
                .build();

        String topic = String.format(com.peekle.global.redis.RedisKeyConst.TOPIC_CURRICULUM, studyId);
        redisPublisher.publish(new org.springframework.data.redis.listener.ChannelTopic(topic),
                com.peekle.global.socket.SocketResponse.of("ADD", responseData));
    }

    /**
     * 커리큘럼에서 문제 삭제 (아무도 풀지 않은 경우에만)
     */
    @Transactional
    public void removeProblem(Long userId, Long studyId, Long problemId) {
        // 문제 ID로 StudyProblem 찾기 (사용자가 Problem ID를 전달한다고 가정, 엔티티를 찾아야 함)
        // 하지만 날짜별로 같은 문제 ID가 여러 개 있을 수 있음.
        // '오늘'의 엔티티를 찾아야 함.
        // 혹은 API가 StudyProblem PK를 전달한다고 가정.
        // 테스트 코드 기준으로 Problem ID(BOJ ID)를 전달함.
        // 가장 안전한 방법은 Study + Problem + Date(Today)로 찾거나 StudyProblem PK로 찾는 것.
        // 여기서는 전달된 ID가 Problem ID(외부)라고 가정하고 오늘의 할당을 삭제함.
        // 조회 로직 확인:
        StudyRoom study = studyRoomRepository.findById(studyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

        // 기존 할당 조회 (오늘 혹은 최근?)
        // 엔드포인트 의미를 따름: 커리큘럼에서 특정 문제 삭제.
        // findByStudyAndProblemId(study, problemId) -> boolean 반환...
        // 삭제할 엔티티가 필요함.
        // 아직 Repository에 problemId로 엔티티를 가져오는 메서드가 없을 수 있음 (exists/count/list만 존재).
        // 추가하거나 list를 사용해야 함.
        // 지금은 전달된 problemId가 BOJ ID라고 가정하고, 오늘 날짜에서 삭제.

        LocalDate targetDate = LocalDate.now();
        List<StudyProblem> candidates = studyProblemRepository.findByStudyIdAndProblemDate(studyId, targetDate);
        StudyProblem target = candidates.stream()
                .filter(p -> p.getProblemId().equals(problemId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_PROBLEM_NOT_FOUND));

        // 제약사항: 제출 기록 없음
        boolean existsLog = submissionLogRepository.existsByProblemIdAndRoomId(target.getProblemId(), studyId);
        if (existsLog) {
            throw new BusinessException(ErrorCode.SUBMISSION_EXISTS);
        }

        Long deletedProblemId = target.getProblemId();
        studyProblemRepository.delete(target);

        // 웹소켓을 통해 알림
        ProblemStatusResponse responseData = ProblemStatusResponse.builder()
                .problemId(deletedProblemId)
                .build();

        String topic = String.format(com.peekle.global.redis.RedisKeyConst.TOPIC_CURRICULUM, studyId);
        redisPublisher.publish(new org.springframework.data.redis.listener.ChannelTopic(topic),
                com.peekle.global.socket.SocketResponse.of("REMOVE", responseData));
    }

    /**
     * 일별 문제 현황 조회 (커리큘럼 + 풀이 상태)
     */
    public List<ProblemStatusResponse> getDailyProblems(Long userId, Long studyId, LocalDate date) {
        // 1. 해당 날짜의 커리큘럼 조회
        List<StudyProblem> curriculum = studyProblemRepository.findByStudyIdAndProblemDate(studyId, date);
        if (curriculum.isEmpty()) {
            return List.of();
        }

        // 2. 스터디 멤버 수 조회
        int totalMembers = studyMemberRepository.countByStudy_Id(studyId); // 메서드가 존재하거나 파생됨

        // 3. 해당 문제들에 대한 제출 기록 조회 (최적화: 일괄 조회)
        List<Long> problemIds = curriculum.stream().map(StudyProblem::getProblemId).collect(Collectors.toList());
        List<SubmissionLog> logs = submissionLogRepository.findAllByRoomIdAndProblemIdIn(studyId, problemIds);

        // 4. 문제 ID -> 푼 유저 ID 매핑
        Map<Long, List<Long>> solvedUserMap = logs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getProblem().getId(), // SubmissionLog는 Problem 엔티티를 가짐
                        Collectors.mapping(log -> log.getUser().getId(), Collectors.toList())));

        // 5. 응답 생성
        return curriculum.stream().map(sp -> {
            // 문제 상세 정보(제목, 티어) 필요 -> 조회?
            // 이상적으로는 StudyProblem이 Problem을 조인해야 하지만, 여기서는 ID를 가짐.
            // 성능: 하나씩 조회하면 N+1 문제 발생.
            // 이상적으로는 Bulk로 조회하거나 SubmissionLog의 문제 정보를 사용해야 함 (하지만 로그가 없을 수 있음).
            // Repository(findById)를 통해 문제 상세 정보를 조회.
            // 최적화: Problem 엔티티를 로드했어야 함.
            // 지금은 problemRepository.findById(sp.getProblemId()) 사용 (N+1 가능성 있지만 배치가 적음 ~3).
            Problem problem = problemRepository.findById(sp.getProblemId()).orElse(null);

            String title = (problem != null) ? problem.getTitle() : "Unknown";
            String tier = (problem != null) ? problem.getTier() : "Unrated";

            List<Long> solvedUsers = solvedUserMap.getOrDefault(sp.getProblemId(), List.of());
            boolean isSolvedByMe = solvedUsers.contains(userId);
            int solvedCount = (int) solvedUsers.stream().distinct().count();

            return ProblemStatusResponse.builder()
                    .problemId(sp.getProblemId())
                    .title(title)
                    .tier(tier)
                    .assignedDate(sp.getProblemDate())
                    .solvedMemberCount(solvedCount)
                    .totalMemberCount(totalMembers)
                    .isSolvedByMe(isSolvedByMe)
                    .build();
        }).collect(Collectors.toList());
    }
}
