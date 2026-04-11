package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptProgressResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsQuestionChoiceResponse;
import com.peekle.domain.cs.dto.response.CsQuestionPayloadResponse;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsAttemptPhase;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsWrongProblemRepository;
import com.peekle.domain.cs.service.store.CsAttemptSession;
import com.peekle.domain.cs.service.store.CsAttemptStore;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsAttemptService {

    private static final int ATTEMPT_QUESTION_COUNT = 10;
    private static final int MESSAGE_SCORE_EXCELLENT = 90;
    private static final int MESSAGE_SCORE_GOOD = 70;
    private static final ZoneId KST_ZONE = ZoneId.of("Asia/Seoul");

    private static final String LOCK_REASON_PREVIOUS_STAGE = "이전 스테이지를 먼저 완료해야 합니다.";
    private static final String LOCK_REASON_NOT_CURRENT_TRACK = "현재 학습 중인 트랙만 입장할 수 있습니다.";

    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsUserDomainProgressRepository csUserDomainProgressRepository;
    private final CsWrongProblemRepository csWrongProblemRepository;
    private final CsAttemptStore csAttemptStore;
    private final UserRepository userRepository;

    @Transactional
    public CsAttemptStartResponse startStageAttempt(Long userId, Long stageId) {
        User user = getUser(userId);
        CsStage stage = getStage(stageId);

        Integer domainId = stage.getTrack().getDomain().getId();
        CsUserDomainProgress progress = csUserDomainProgressRepository
                .findByUser_IdAndDomain_Id(user.getId(), domainId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_STUDYING));

        validateStageAccess(progress, stage);

        List<CsQuestion> loadedQuestions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId);
        if (loadedQuestions.isEmpty()) {
            throw new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND, "스테이지에 등록된 문제가 없습니다.");
        }

        List<CsQuestion> questionSet = selectQuestionSet(loadedQuestions);
        List<Long> questionIds = questionSet.stream()
                .map(CsQuestion::getId)
                .toList();

        LocalDateTime now = LocalDateTime.now();
        CsAttemptSession session = CsAttemptSession.builder()
                .userId(userId)
                .stageId(stageId)
                .domainId(domainId)
                .phase(CsAttemptPhase.FIRST_PASS)
                .retryRound(0)
                .questionOrder(questionIds)
                .currentRoundQuestionIds(questionIds)
                .currentRoundIndex(0)
                .firstPassCorrectCount(0)
                .firstPassWrongQuestionIds(new HashSet<>())
                .wrongAttemptCountByQuestionId(new HashMap<>())
                .latestCorrectByQuestionId(new HashMap<>())
                .startedAt(now)
                .updatedAt(now)
                .build();

        csAttemptStore.delete(userId, stageId);
        csAttemptStore.save(session);

        return new CsAttemptStartResponse(stageId, questionSet.size(), toQuestionPayload(questionSet.get(0)));
    }

    @Transactional
    public CsAttemptAnswerResponse submitAnswer(Long userId, Long stageId, CsAttemptAnswerRequest request) {
        getUser(userId);
        CsAttemptSession session = getAttemptSession(userId, stageId);

        if (session.getPhase() == CsAttemptPhase.COMPLETED) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "이미 완료된 세션입니다.");
        }

        List<Long> currentRoundQuestionIds = session.getCurrentRoundQuestionIds();
        int currentRoundIndex = session.getCurrentRoundIndex();

        if (currentRoundQuestionIds == null || currentRoundQuestionIds.isEmpty() || currentRoundIndex >= currentRoundQuestionIds.size()) {
            throw new BusinessException(ErrorCode.CS_ATTEMPT_EXPIRED, "유효하지 않은 세션 상태입니다.");
        }

        Long expectedQuestionId = currentRoundQuestionIds.get(currentRoundIndex);
        if (!expectedQuestionId.equals(request.questionId())) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "현재 순서의 문제를 제출해야 합니다.");
        }

        CsQuestion question = csQuestionRepository.findByIdAndStage_Id(request.questionId(), stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        int currentQuestionNo = currentRoundIndex + 1;
        int totalQuestionCount = currentRoundQuestionIds.size();

        boolean isCorrect = gradeAnswerByMockPolicy(question, request);
        applyAnswerState(session, question.getId(), isCorrect);
        moveToNextQuestion(session);

        session.setUpdatedAt(LocalDateTime.now());
        csAttemptStore.save(session);

        CsQuestionPayloadResponse nextQuestion = null;
        boolean isLast = session.getPhase() == CsAttemptPhase.COMPLETED;

        if (!isLast) {
            Long nextQuestionId = session.getCurrentRoundQuestionIds().get(session.getCurrentRoundIndex());
            CsQuestion next = csQuestionRepository.findByIdAndStage_Id(nextQuestionId, stageId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));
            nextQuestion = toQuestionPayload(next);
        }

        return new CsAttemptAnswerResponse(
                question.getId(),
                question.getQuestionType(),
                new CsAttemptProgressResponse(currentQuestionNo, totalQuestionCount),
                session.getPhase(),
                isCorrect,
                isCorrect ? "정답입니다." : "오답입니다.",
                isLast,
                nextQuestion);
    }

    @Transactional
    public CsAttemptCompleteResponse completeAttempt(Long userId, Long stageId) {
        User user = getUser(userId);
        CsStage stage = getStage(stageId);
        CsAttemptSession session = getAttemptSession(userId, stageId);

        if (session.getPhase() != CsAttemptPhase.COMPLETED) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "아직 풀이가 완료되지 않았습니다.");
        }

        int totalQuestionCount = session.getQuestionOrder().size();
        int correctCount = session.getFirstPassCorrectCount();
        int wrongCount = Math.max(totalQuestionCount - correctCount, 0);
        int correctRate = totalQuestionCount == 0
                ? 0
                : (int) Math.round((correctCount * 100.0) / totalQuestionCount);

        persistWrongProblems(user, session);

        Long nextStageId = resolveNextStageId(stage);
        boolean isTrackCompleted = nextStageId == null;

        updateDomainProgressIfNeeded(userId, stage, nextStageId);
        StreakResult streak = applyStreak(user);

        csAttemptStore.delete(userId, stageId);

        return new CsAttemptCompleteResponse(
                stageId,
                isTrackCompleted,
                correctRate,
                correctCount,
                wrongCount,
                resolveMessageCode(correctRate),
                streak.earnedToday(),
                streak.currentStreak(),
                nextStageId);
    }

    private CsAttemptSession getAttemptSession(Long userId, Long stageId) {
        return csAttemptStore.find(userId, stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_ATTEMPT_NOT_FOUND));
    }

    private void applyAnswerState(CsAttemptSession session, Long questionId, boolean isCorrect) {
        if (session.getPhase() == CsAttemptPhase.FIRST_PASS) {
            if (isCorrect) {
                session.setFirstPassCorrectCount(session.getFirstPassCorrectCount() + 1);
            } else {
                session.getFirstPassWrongQuestionIds().add(questionId);
            }
        }

        if (!isCorrect) {
            session.getWrongAttemptCountByQuestionId().merge(questionId, 1, Integer::sum);
        }

        session.getLatestCorrectByQuestionId().put(questionId, isCorrect);
    }

    private void moveToNextQuestion(CsAttemptSession session) {
        int nextIndex = session.getCurrentRoundIndex() + 1;
        List<Long> currentRound = session.getCurrentRoundQuestionIds();

        if (nextIndex < currentRound.size()) {
            session.setCurrentRoundIndex(nextIndex);
            return;
        }

        List<Long> wrongQuestionIds = currentRound.stream()
                .filter(questionId -> !Boolean.TRUE.equals(session.getLatestCorrectByQuestionId().get(questionId)))
                .toList();

        if (wrongQuestionIds.isEmpty()) {
            session.setPhase(CsAttemptPhase.COMPLETED);
            session.setCurrentRoundQuestionIds(List.of());
            session.setCurrentRoundIndex(0);
            return;
        }

        if (session.getPhase() == CsAttemptPhase.FIRST_PASS) {
            session.setRetryRound(1);
        } else {
            session.setRetryRound(session.getRetryRound() + 1);
        }

        session.setPhase(CsAttemptPhase.RETRY_WRONG);
        session.setCurrentRoundQuestionIds(wrongQuestionIds);
        session.setCurrentRoundIndex(0);
    }

    private boolean gradeAnswerByMockPolicy(CsQuestion question, CsAttemptAnswerRequest request) {
        CsQuestionType questionType = question.getQuestionType();

        return switch (questionType) {
            case MULTIPLE_CHOICE, OX -> {
                Integer selectedChoiceNo = request.selectedChoiceNo();
                if (selectedChoiceNo == null || selectedChoiceNo <= 0) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "객관식/OX는 selectedChoiceNo가 필요합니다.");
                }

                boolean existsChoice = csQuestionChoiceRepository.findByQuestion_IdOrderByChoiceNoAsc(question.getId())
                        .stream()
                        .anyMatch(choice -> choice.getChoiceNo() != null
                                && choice.getChoiceNo().intValue() == selectedChoiceNo);
                if (!existsChoice) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "존재하지 않는 선택지입니다.");
                }

                // #143 단계: 목 채점 정책(1번 선택지를 정답으로 가정)
                yield selectedChoiceNo == 1;
            }
            case SHORT_ANSWER, ESSAY -> {
                String answerText = request.answerText();
                if (answerText == null || answerText.isBlank()) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "서술형/단답형은 answerText가 필요합니다.");
                }
                // #143 단계: 목 채점 정책("정답" 포함 텍스트를 정답으로 가정)
                yield answerText.trim().contains("정답");
            }
        };
    }

    private void persistWrongProblems(User user, CsAttemptSession session) {
        if (session.getWrongAttemptCountByQuestionId().isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<Long, Integer> entry : session.getWrongAttemptCountByQuestionId().entrySet()) {
            Long questionId = entry.getKey();
            int wrongCount = entry.getValue() == null ? 0 : entry.getValue();

            if (wrongCount <= 0) {
                continue;
            }

            CsQuestion question = csQuestionRepository.findById(questionId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

            CsWrongProblem wrongProblem = csWrongProblemRepository.findByUser_IdAndQuestion_Id(user.getId(), questionId)
                    .orElseGet(() -> CsWrongProblem.builder()
                            .user(user)
                            .question(question)
                            .domain(question.getStage().getTrack().getDomain())
                            .wrongCount(0)
                            .reviewCorrectCount(0)
                            .lastWrongAt(now)
                            .updatedAt(now)
                            .build());

            for (int i = 0; i < wrongCount; i++) {
                wrongProblem.markWrong();
            }
            csWrongProblemRepository.save(wrongProblem);
        }
    }

    private Long resolveNextStageId(CsStage stage) {
        return csStageRepository.findByTrack_IdAndStageNo(stage.getTrack().getId(), (short) (stage.getStageNo() + 1))
                .map(CsStage::getId)
                .orElse(null);
    }

    private void updateDomainProgressIfNeeded(Long userId, CsStage stage, Long nextStageId) {
        Integer domainId = stage.getTrack().getDomain().getId();
        CsUserDomainProgress progress = csUserDomainProgressRepository.findByUser_IdAndDomain_Id(userId, domainId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_PROGRESS_NOT_FOUND));

        if (!progress.getCurrentTrackNo().equals(stage.getTrack().getTrackNo())) {
            return;
        }
        if (!progress.getCurrentStageNo().equals(stage.getStageNo())) {
            return;
        }
        if (nextStageId == null) {
            return;
        }

        progress.advanceTo(progress.getCurrentTrackNo(), (short) (stage.getStageNo() + 1));
    }

    private StreakResult applyStreak(User user) {
        ZonedDateTime now = ZonedDateTime.now(KST_ZONE);
        if (now.getHour() < 6) {
            now = now.minusDays(1);
        }

        LocalDate todayStreakDate = now.toLocalDate();
        LocalDate yesterdayStreakDate = todayStreakDate.minusDays(1);

        boolean alreadySolvedToday = user.getLastSolvedDate() != null
                && user.getLastSolvedDate().equals(todayStreakDate);

        if (alreadySolvedToday) {
            return new StreakResult(false, safeInt(user.getStreakCurrent()));
        }

        boolean continuesStreak = user.getLastSolvedDate() != null
                && user.getLastSolvedDate().equals(yesterdayStreakDate);

        user.updateStreak(continuesStreak, todayStreakDate);
        return new StreakResult(true, safeInt(user.getStreakCurrent()));
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private String resolveMessageCode(int correctRate) {
        if (correctRate >= MESSAGE_SCORE_EXCELLENT) {
            return "CS_RESULT_EXCELLENT";
        }
        if (correctRate >= MESSAGE_SCORE_GOOD) {
            return "CS_RESULT_GOOD";
        }
        return "CS_RESULT_KEEP_GOING";
    }

    private List<CsQuestion> selectQuestionSet(List<CsQuestion> loadedQuestions) {
        if (loadedQuestions.size() <= ATTEMPT_QUESTION_COUNT) {
            return loadedQuestions;
        }
        return new ArrayList<>(loadedQuestions.subList(0, ATTEMPT_QUESTION_COUNT));
    }

    private void validateStageAccess(CsUserDomainProgress progress, CsStage stage) {
        short currentTrackNo = progress.getCurrentTrackNo();
        short currentStageNo = progress.getCurrentStageNo();
        short targetTrackNo = stage.getTrack().getTrackNo();
        short targetStageNo = stage.getStageNo();

        if (targetTrackNo != currentTrackNo) {
            throw new BusinessException(ErrorCode.CS_FORBIDDEN_STAGE_ACCESS, LOCK_REASON_NOT_CURRENT_TRACK);
        }

        if (targetStageNo > currentStageNo) {
            throw new BusinessException(ErrorCode.CS_FORBIDDEN_STAGE_ACCESS, LOCK_REASON_PREVIOUS_STAGE);
        }
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private CsStage getStage(Long stageId) {
        return csStageRepository.findByIdWithTrackAndDomain(stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_STAGE_NOT_FOUND));
    }

    private CsQuestionPayloadResponse toQuestionPayload(CsQuestion question) {
        List<CsQuestionChoiceResponse> choices = switch (question.getQuestionType()) {
            case MULTIPLE_CHOICE, OX -> csQuestionChoiceRepository
                    .findByQuestion_IdOrderByChoiceNoAsc(question.getId())
                    .stream()
                    .map(choice -> new CsQuestionChoiceResponse(
                            (int) choice.getChoiceNo(),
                            choice.getContent()))
                    .toList();
            default -> List.of();
        };

        return new CsQuestionPayloadResponse(
                question.getId(),
                question.getQuestionType(),
                question.getPrompt(),
                choices.isEmpty() ? null : choices);
    }

    private record StreakResult(boolean earnedToday, int currentStreak) {
    }
}
