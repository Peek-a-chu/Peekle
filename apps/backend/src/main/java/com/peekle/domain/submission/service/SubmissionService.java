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
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.util.SolvedAcLevelUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionLogRepository submissionLogRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final LeagueService leagueService;
    private final SubmissionValidator submissionValidator;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisGameService redisGameService;

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

        // 0. 검증 (Extension 변조 방지) - AC(성공)일 때만 검증, 단 TEST_TOKEN이면 패스
        if (!"TEST_TOKEN".equals(token) && request.getIsSuccess() && user.getBojId() != null
                && !user.getBojId().isEmpty()) {
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
        } else if (!request.getIsSuccess()) {
            // WA, RTE, TLE 등 실패한 제출은 검증 없이 저장
            System.out.println("⚠️ Skip Validation: Failed submission (WA/RTE/TLE/etc)");
        } else {
            System.out.println("⚠️ Skip Validation: User has no BOJ ID linked.");
        }

        // --- [Strict Game Length Validation] ---
        if (SourceType.GAME.name().equalsIgnoreCase(request.getSourceType()) && request.getIsSuccess()) {
            try {
                String expectedLenKey = String.format(RedisKeyConst.GAME_EXPECTED_LENGTH,
                        request.getRoomId(), request.getProblemId(), user.getId());
                String expectedLenStr = (String) redisTemplate.opsForValue().get(expectedLenKey);

                if (expectedLenStr != null) {
                    int expectedLen = Integer.parseInt(expectedLenStr);
                    // Normalize submitted code length
                    int submittedLen = (request.getCode() != null)
                            ? request.getCode().replace("\r\n", "\n").trim().length()
                            : 0;

                    if (submittedLen != expectedLen) {
                        log.error("[Strict Validation] Length Mismatch! User: {}, Expected: {}, Submitted: {}",
                                user.getId(), expectedLen, submittedLen);
                        return SubmissionResponse.builder()
                                .success(false)
                                .message("제출된 코드의 길이가 IDE와 다릅니다. 조작이 의심되어 채점이 취소되었습니다.")
                                .build();
                    }
                    log.info("[Strict Validation] Length match success. User: {}, Len: {}", user.getId(),
                            submittedLen);
                    // 검증 완료 후 키 삭제
                    redisTemplate.delete(expectedLenKey);
                } else {
                    log.warn("[Strict Validation] No expected length found in Redis for User: {}, Room: {}, Prob: {}",
                            user.getId(), request.getRoomId(), request.getProblemId());
                    // 1차 구현에서는 키가 없는 경우 경고만 하고 통과 (구형 버전 대응 등)
                    // 향후 필수값으로 전환 가능
                }
            } catch (Exception e) {
                log.error("[Strict Validation] Error during length validation", e);
            }
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

        // tier level calculation for problem creation (already done above)
        // reuse tierStr if possible or fetch from problem if it was existing.
        // If problem was looked up (not new), we rely on problem.getTier().
        // BUT user wanted to use "Extension Data".
        // Request has problemTitle and problemTier?
        // request.getProblemTier() is "11", we convert to "Gold 5".

        // Let's ensure we have the correct tier string to pass.
        // If we created a new problem, we have tierStr.
        // If we found an existing problem, we might want to use the one from DB OR the
        // one from request.
        // To respect "Extension provided", we should re-calculate tierStr from request.

        int reqTierLevel = 0;
        try {
            reqTierLevel = Integer.parseInt(request.getProblemTier());
        } catch (NumberFormatException e) {
            reqTierLevel = 0;
        }
        String reqTierStr = SolvedAcLevelUtil.convertLevelToTier(reqTierLevel);

        // 5. Tag 생성 (방 이름 등)
        // 현재는 확장 프로그램에서 직접 호출 시 room 정보가 없을 수 있음.
        // 추후 request에 roomName 등이 포함되거나, roomId로 조회하여 설정 필요.
        // 우선은 null 또는 기본값 설정.
        String tag = null;
        if (request.getSourceType() != null && !request.getSourceType().equalsIgnoreCase("EXTENSION")) {
            // If manual submission from study/game, maybe generate tag here?
            // For now, simpler to leave null as user said implementations are pending.
        }

        SubmissionLog log = SubmissionLog.create(
                user, problem, sourceType,
                request.getProblemTitle(), reqTierStr, externalId,
                tag,
                request.getResult(), // result 추가
                request.getIsSuccess(), // isSuccess 추가
                request.getCode(),
                request.getMemory(), request.getExecutionTime(),
                request.getLanguage(), submittedAt);

        log.setRoomId(request.getRoomId());

        submissionLogRepository.save(log);

        // 5. 리그 포인트 & 랭킹 계산
        int earnedPoints = leagueService.updateLeaguePointForSolvedProblem(user, problem);

        // 그룹 내 순위 및 상태 계산 (LeagueService 활용)
        com.peekle.domain.league.dto.UserLeagueStatusDto statusDto = leagueService.getUserLeagueStatus(user);

        System.out.println("✅ Submission saved! ID: " + log.getId());

        // 성공/실패 여부에 따라 다른 응답
        boolean isAC = request.getIsSuccess() != null && request.getIsSuccess();

        if (isAC) {
            // 유저가 게임 중이라면 점수 반영
            try {
                String userGameKey = String.format(RedisKeyConst.USER_CURRENT_GAME, user.getId());
                Object gameIdObj = redisTemplate.opsForValue().get(userGameKey);

                if (gameIdObj != null) {
                    Long gameId = Long.parseLong(String.valueOf(gameIdObj));
                    redisGameService.solveProblem(user.getId(), gameId, problem.getId());
                    System.out.println("🎮 Game Score Updated for Game ID: " + gameId);
                }
            } catch (Exception e) {
                System.err.println("Failed to update game score: " + e.getMessage());
            }

            // AC (맞았습니다) - 포인트 획득 가능
            return SubmissionResponse.builder()
                    .success(true)
                    .submissionId(log.getId())
                    .firstSolve(earnedPoints > 0)
                    .earnedPoints(earnedPoints)
                    .totalPoints(user.getLeaguePoint())
                    .currentRank(statusDto.getGroupRank())
                    .currentLeague(user.getLeague())
                    .leagueStatus(statusDto.getLeagueStatus())
                    .pointsToPromotion(statusDto.getPointsToPromotion())
                    .pointsToMaintenance(statusDto.getPointsToMaintenance())
                    .message(earnedPoints > 0 ? "Problem Solved! (+" + earnedPoints + ")" : "Already Solved.")
                    .build();
        } else {
            // WA, RTE, TLE, MLE, OLE 등 - 저장만 하고 포인트 없음
            return SubmissionResponse.builder()
                    .success(false) // 실패 토스트 표시용
                    .submissionId(log.getId())
                    .totalPoints(user.getLeaguePoint())
                    .currentRank(statusDto.getGroupRank())
                    .currentLeague(user.getLeague())
                    .leagueStatus(statusDto.getLeagueStatus())
                    .pointsToPromotion(statusDto.getPointsToPromotion())
                    .pointsToMaintenance(statusDto.getPointsToMaintenance())
                    .message(request.getResult()) // "틀렸습니다", "런타임 에러" 등
                    .build();
        }
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
     * 특정 스터디, 특정 문제의 성공한 제출 목록 조회 (유저별 최신 제출 1건씩 반환) - Pagination
     */
    @Transactional(readOnly = true)
    public Page<SubmissionLogResponse> getStudyProblemSubmissions(
            Long studyId, Long problemId, Pageable pageable) {

        Page<SubmissionLog> logs = submissionLogRepository
                .findLatestSubmissionsByRoomIdAndProblemId(studyId, problemId, pageable);

        return logs.map(SubmissionLogResponse::from);
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
