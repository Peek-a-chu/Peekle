package com.peekle.domain.submission.service;

import com.peekle.domain.league.service.LeagueService;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.submission.dto.SubmissionLogResponse;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.enums.SourceType;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.util.SolvedAcLevelUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionLogRepository submissionLogRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final LeagueService leagueService;
    private final SubmissionValidator submissionValidator;

    @Transactional
    public SubmissionResponse saveGeneralSubmission(SubmissionRequest request) {

        // 1. 유저 조회 (토큰 기반)
        User user;
        String token = request.getExtensionToken();

        if (token != null && !token.isEmpty()) {
            user = userRepository.findByExtensionToken(token)
                    .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
        } else {
            // Fallback for mock/test (or throw exception properly in production)
            try {
                user = userRepository.findByNickname("test_user")
                        .orElseGet(() -> userRepository.save(createTempUser()));
            } catch (Exception e) {
                throw new BusinessException(ErrorCode.USER_VERIFICATION_FAILED);
            }
        }

        // 0. 검증 (Extension 변조 방지)
        // 0. 검증 (Extension 변조 방지)
        if (user.getBojId() != null && !user.getBojId().isEmpty()) {
            try {
                submissionValidator.validateSubmission(
                        String.valueOf(request.getProblemId()),
                        user.getBojId(),
                        request.getSubmitId(),
                        request.getCode());
            } catch (BusinessException e) {
                // 검증 실패 시: 저장하지 않고 실패 응답 반환
                System.out.println("❌ Submission Validation Failed: " + e.getMessage());
                return SubmissionResponse.builder()
                        .success(false)
                        .message("검증 실패: " + e.getMessage())
                        .build();
            } catch (Exception e) {
                System.out.println("❌ Submission Validation Error: " + e.getMessage());
                return SubmissionResponse.builder()
                        .success(false)
                        .message("검증 중 오류 발생: " + e.getMessage())
                        .build();
            }
        } else {
            System.out.println("⚠️ Skip Validation: User has no BOJ ID linked.");
        }

        // 2. 문제 조회
        String externalId = String.valueOf(request.getProblemId());
        Problem problem = problemRepository.findByExternalIdAndSource(externalId, "BOJ")
                .orElseGet(() -> {
                    int tierLevel = 0;
                    try {
                        tierLevel = Integer.parseInt(request.getProblemTier());
                    } catch (NumberFormatException e) {
                        tierLevel = 0;
                    }
                    String tierStr = SolvedAcLevelUtil.convertLevelToTier(tierLevel);

                    Problem newProblem = new Problem(
                            "BOJ", externalId, request.getProblemTitle(),
                            tierStr, "https://www.acmicpc.net/problem/" + externalId);
                    return problemRepository.save(newProblem);
                });

        // 4. SubmissionLog 저장
        LocalDateTime submittedAt = parseDateTime(request.getSubmittedAt());

        SourceType sourceType = SourceType.EXTENSION;
        if (request.getSourceType() != null) {
            try {
                sourceType = SourceType.valueOf(request.getSourceType().toUpperCase());
            } catch (IllegalArgumentException e) {
                sourceType = SourceType.EXTENSION;
            }
        }

        SubmissionLog log = SubmissionLog.create(
                user, problem, sourceType,
                request.getCode(),
                request.getMemory(), request.getExecutionTime(),
                request.getLanguage(), submittedAt);

        log.setRoomId(request.getRoomId());

        submissionLogRepository.save(log);

        // 5. 리그 포인트 & 랭킹 계산
        int earnedPoints = leagueService.updateLeaguePointForSolvedProblem(user, problem);
        int currentRank = leagueService.getUserRank(user);

        System.out.println("✅ Submission saved! ID: " + log.getId());

        return SubmissionResponse.builder()
                .success(true)
                .submissionId(log.getId())
                .firstSolve(earnedPoints > 0)
                .earnedPoints(earnedPoints)
                .totalPoints(user.getLeaguePoint())
                .currentRank(currentRank)
                .currentLeague(user.getLeague())
                .message(earnedPoints > 0 ? "Problem Solved! (+" + earnedPoints + ")" : "Already Solved.")
                .build();
    }

    private User createTempUser() {
        return new User("test_social_id", "TEST", "test_user");
    }

    private LocalDateTime parseDateTime(String isoString) {
        if (isoString == null)
            return LocalDateTime.now();
        try {
            return LocalDateTime.parse(isoString, DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    /**
     * 특정 스터디, 특정 문제의 성공한 제출 목록 조회 (유저별 최신 1개)
     */
    @Transactional(readOnly = true)
    public List<SubmissionLogResponse> getStudyProblemSubmissions(
            Long studyId, Long problemId) {
        // DB 최적화 조회 (유저별 최신 1개만 가져옴)
        List<SubmissionLog> logs = submissionLogRepository.findLatestLogsPerUser(studyId, problemId);

        List<SubmissionLogResponse> result = new ArrayList<>();
        for (SubmissionLog log : logs) {
            result.add(SubmissionLogResponse.from(log));
        }

        return result;
    }

    /**
     * 특정 제출 내역 상세 조회 (코드 포함)
     */
    @Transactional(readOnly = true)
    public SubmissionResponse getSubmissionDetail(Long submissionId) {
        SubmissionLog log = submissionLogRepository.findById(submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));

        return SubmissionResponse.builder()
                .success(true)
                .submissionId(log.getId())
                .code(log.getCode()) // 코드 포함
                .language(log.getLanguage())
                .memory(log.getMemory())
                .executionTime(log.getExecutionTime())
                .submittedAt(log.getSubmittedAt().toString())
                .message("Detail retrieved")
                .build();
    }
}
