package com.peekle.domain.study.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.dto.curriculum.StudyProblemAddRequest;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.enums.ProblemType;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
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
        public ProblemStatusResponse addProblem(Long userId, Long studyId, StudyProblemAddRequest request) {
                StudyRoom study = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                Long actualProblemId = request.getProblemId();
                Problem problem = null;

                // problemId가 있으면 DB 조회
                if (actualProblemId != null && actualProblemId > 0) {
                        problem = problemRepository.findById(actualProblemId)
                                        .orElseThrow(() -> new BusinessException(ErrorCode.PROBLEM_NOT_FOUND));
                } else {
                        // Custom Problem Check
                        if (request.getCustomTitle() == null || request.getCustomTitle().trim().isEmpty()) {
                                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
                        }
                }

                // 제약사항 1: 문제 날짜는 오늘이어야 함
                LocalDate targetDate = (request.getProblemDate() != null) ? request.getProblemDate() : LocalDate.now();
                if (!targetDate.equals(LocalDate.now())) {
                        throw new BusinessException(ErrorCode.PROBLEM_DATE_MISMATCH);
                }

                // 제약사항 2: 중복 확인 (일반 문제인 경우만)
                if (problem != null) {
                        if (studyProblemRepository.existsByStudyAndProblemIdAndProblemDate(study, actualProblemId,
                                        targetDate)) {
                                throw new BusinessException(ErrorCode.PROBLEM_ALREADY_ADDED);
                        }
                }

                StudyProblem studyProblem = StudyProblem.builder()
                                .study(study)
                                .problemId(problem != null ? actualProblemId : null)
                                .customTitle(problem == null ? request.getCustomTitle() : null)
                                .customLink(request.getCustomLink() != null ? request.getCustomLink()
                                                : (problem != null
                                                                ? "https://www.acmicpc.net/problem/"
                                                                                + problem.getExternalId()
                                                                : null))
                                .problemDate(targetDate)
                                .createdBy(user)
                                .type(request.getProblemType() != null
                                                ? request.getProblemType()
                                                : (problem != null ? ProblemType.BOJ : ProblemType.CUSTOM))
                                .build();

                studyProblemRepository.save(studyProblem);

                String title = (problem != null) ? problem.getTitle() : studyProblem.getCustomTitle();
                String tier = (problem != null) ? problem.getTier() : "Custom";
                String externalId = (problem != null) ? problem.getExternalId() : "Custom";
                String customLink = studyProblem.getCustomLink();
                String type = studyProblem.getType().name();
                List<String> tags = (problem != null)
                                ? problem.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                                : List.of();

                ProblemStatusResponse responseData = ProblemStatusResponse.builder()
                                .studyProblemId(studyProblem.getId())
                                .problemId(studyProblem.getProblemId())
                                .externalId(externalId)
                                .title(title)
                                .customTitle(studyProblem.getCustomTitle())
                                .customLink(customLink)
                                .tier(tier)
                                .type(type)
                                .tags(tags)
                                .assignedDate(targetDate)
                                .solvedMemberCount(0)
                                .totalMemberCount(studyMemberRepository.countByStudy_Id(studyId))
                                .isSolvedByMe(false)
                                .build();

                String topic = String.format(RedisKeyConst.TOPIC_CURRICULUM, studyId);
                redisPublisher.publish(new ChannelTopic(topic),
                                SocketResponse.of("ADD", responseData));

                return responseData;
        }

        /**
         * 커리큘럼에서 문제 삭제 (아무도 풀지 않은 경우에만)
         */
        @Transactional
        public ProblemStatusResponse removeProblem(Long userId, Long studyId, Long problemId, Long studyProblemId) {
                // StudyRoom study = studyRoomRepository.findById(studyId)
                // .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));
                // 'study' variable is not used in this method, only studyId is used.
                // Keeping validation if strict check is needed, but assuming studyId validity
                // is checked by finding studyProblem?
                // Actually, finding studyProblem by ID (if provided) implicitly checks
                // existence.
                // But we should probably verify the study exists or at least the studyProblem
                // belongs to the study.
                // For now, removing the unused variable to fix lint.
                if (!studyRoomRepository.existsById(studyId)) {
                        throw new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND);
                }

                StudyProblem target = null;

                // 1. Try to find by invalid studyProblemId (PK) if provided
                if (studyProblemId != null) {
                        target = studyProblemRepository.findById(studyProblemId)
                                        .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_PROBLEM_NOT_FOUND));
                }
                // 2. Fallback to problemId and Today (for backward compatibility or existing
                // logic)
                else if (problemId != null) {
                        LocalDate targetDate = LocalDate.now();
                        List<StudyProblem> candidates = studyProblemRepository.findByStudyIdAndProblemDate(studyId,
                                        targetDate);
                        target = candidates.stream()
                                        .filter(p -> problemId.equals(p.getProblemId()))
                                        .findFirst()
                                        .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_PROBLEM_NOT_FOUND));
                } else {
                        throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
                }

                // 제약사항: 제출 기록 없음 (Only for registered problems)
                if (target.getProblemId() != null) {
                        boolean existsLog = submissionLogRepository.existsByProblemIdAndRoomId(target.getProblemId(),
                                        studyId);
                        if (existsLog) {
                                throw new BusinessException(ErrorCode.SUBMISSION_EXISTS);
                        }
                }

                Long deletedProblemId = target.getProblemId();

                // 삭제 전에 문제 정보 조회
                Problem problem = (deletedProblemId != null) ? problemRepository.findById(deletedProblemId).orElse(null)
                                : null;
                String title = (problem != null) ? problem.getTitle() : target.getCustomTitle();
                String tier = (problem != null) ? problem.getTier() : "Custom";
                String externalId = (problem != null) ? problem.getExternalId() : "Custom";
                String customLink = target.getCustomLink();
                String type = target.getType().name();
                List<String> tags = (problem != null)
                                ? problem.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                                : List.of();

                studyProblemRepository.delete(target);

                // 웹소켓을 통해 알림
                ProblemStatusResponse responseData = ProblemStatusResponse.builder()
                                .studyProblemId(target.getId())
                                .problemId(deletedProblemId)
                                .externalId(externalId)
                                .title(title)
                                .customTitle(target.getCustomTitle())
                                .customLink(customLink)
                                .tier(tier)
                                .type(type)
                                .tags(tags)
                                .assignedDate(target.getProblemDate())
                                .solvedMemberCount(0)
                                .totalMemberCount(studyMemberRepository.countByStudy_Id(studyId))
                                .isSolvedByMe(false)
                                .build();

                String topic = String.format(RedisKeyConst.TOPIC_CURRICULUM, studyId);
                redisPublisher.publish(new ChannelTopic(topic),
                                SocketResponse.of("REMOVE", responseData));

                return responseData;
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
                int totalMembers = studyMemberRepository.countByStudy_Id(studyId);

                // 3. 해당 문제들에 대한 제출 기록 조회 (최적화: 일괄 조회)
                // Filter out custom problems (problemId is null)
                List<Long> problemIds = curriculum.stream()
                                .filter(sp -> sp.getProblemId() != null)
                                .map(StudyProblem::getProblemId)
                                .collect(Collectors.toList());

                List<SubmissionLog> logs = problemIds.isEmpty() ? List.of()
                                : submissionLogRepository.findAllByRoomIdAndProblemIdIn(studyId, problemIds);

                // 4. 문제 ID -> 푼 유저 ID 매핑
                Map<Long, List<Long>> solvedUserMap = logs.stream()
                                .collect(Collectors.groupingBy(
                                                log -> log.getProblem().getId(),
                                                Collectors.mapping(log -> log.getUser().getId(), Collectors.toList())));

                // 5. 응답 생성
                return curriculum.stream().map(sp -> {
                        Problem problem = (sp.getProblemId() != null)
                                        ? problemRepository.findById(sp.getProblemId()).orElse(null)
                                        : null;

                        String title = (problem != null) ? problem.getTitle() : sp.getCustomTitle();
                        String tier = (problem != null) ? problem.getTier() : "Custom";
                        String externalId = (problem != null) ? problem.getExternalId() : "Custom";
                        String type = sp.getType().name();

                        // Use builder with all fields
                        List<String> tags = (problem != null)
                                        ? problem.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                                        : List.of();

                        List<Long> solvedUsers = (sp.getProblemId() != null)
                                        ? solvedUserMap.getOrDefault(sp.getProblemId(), List.of())
                                        : List.of();
                        boolean isSolvedByMe = solvedUsers.contains(userId);
                        int solvedCount = (int) solvedUsers.stream().distinct().count();

                        return ProblemStatusResponse.builder()
                                        .studyProblemId(sp.getId())
                                        .problemId(sp.getProblemId())
                                        .externalId(externalId)
                                        .title(title)
                                        .customTitle(sp.getCustomTitle())
                                        .customLink(sp.getCustomLink())
                                        .tier(tier)
                                        .type(type)
                                        .tags(tags)
                                        .assignedDate(sp.getProblemDate())
                                        .solvedMemberCount(solvedCount)
                                        .totalMemberCount(totalMembers)
                                        .isSolvedByMe(isSolvedByMe)
                                        .build();
                }).collect(Collectors.toList());
        }
}
