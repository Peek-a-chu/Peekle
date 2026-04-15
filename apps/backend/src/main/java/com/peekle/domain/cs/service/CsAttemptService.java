package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptProgressResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsQuestionChoiceResponse;
import com.peekle.domain.cs.dto.response.CsQuestionPayloadResponse;
import com.peekle.domain.cs.entity.CsPastExamBestScore;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import com.peekle.domain.cs.entity.CsStageAttemptLog;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsAttemptPhase;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsQuestionShortAnswerRepository;
import com.peekle.domain.cs.repository.CsPastExamBestScoreRepository;
import com.peekle.domain.cs.repository.CsStageAttemptLogRepository;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsAttemptService {

    private static final int CURRICULUM_ATTEMPT_QUESTION_COUNT = 10;
    private static final int PAST_EXAM_ATTEMPT_QUESTION_MAX_COUNT = 20;
    private static final int MESSAGE_SCORE_EXCELLENT = 90;
    private static final int MESSAGE_SCORE_GOOD = 70;
    private static final ZoneId KST_ZONE = ZoneId.of("Asia/Seoul");
    private static final String MULTI_BLANK_DELIMITER = "|||";
    private static final Pattern BLANK_COUNT_PATTERN = Pattern.compile("\"blankCount\"\\s*:\\s*(\\d+)");
    private static final Pattern ITEM_COUNT_PATTERN = Pattern.compile("\"itemCount\"\\s*:\\s*(\\d+)");

    private static final String LOCK_REASON_PREVIOUS_STAGE = "이전 스테이지를 먼저 완료해야 합니다.";
    private static final String LOCK_REASON_NOT_CURRENT_TRACK = "현재 학습 중인 트랙만 입장할 수 있습니다.";

    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsQuestionShortAnswerRepository csQuestionShortAnswerRepository;
    private final CsPastExamBestScoreRepository csPastExamBestScoreRepository;
    private final CsStageAttemptLogRepository csStageAttemptLogRepository;
    private final CsUserDomainProgressRepository csUserDomainProgressRepository;
    private final CsWrongProblemRepository csWrongProblemRepository;
    private final CsAttemptStore csAttemptStore;
    private final UserRepository userRepository;

    @Transactional
    public CsAttemptStartResponse startStageAttempt(Long userId, Long stageId) {
        User user = getUser(userId);
        CsStage stage = getStage(stageId);

        Integer domainId = stage.getTrack().getDomain().getId();
        if (stage.getTrack().getLearningMode() == CsTrackLearningMode.CURRICULUM) {
            CsUserDomainProgress progress = csUserDomainProgressRepository
                    .findByUser_IdAndDomain_Id(user.getId(), domainId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_STUDYING));

            validateStageAccess(progress, stage);
        }

        List<CsQuestion> loadedQuestions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId);
        if (loadedQuestions.isEmpty()) {
            throw new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND, "스테이지에 등록된 문제가 없습니다.");
        }

        int targetQuestionCount = resolveAttemptQuestionCount(stage, loadedQuestions.size());
        List<CsQuestion> questionSet = selectQuestionSet(loadedQuestions, targetQuestionCount);
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
        int totalQuestionCount = session.getQuestionOrder().size();

        GradingResult gradingResult = gradeAnswer(question, request);
        boolean isCorrect = gradingResult.isCorrect();

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
                buildFeedback(gradingResult),
                isCorrect ? null : gradingResult.correctChoiceNo(),
                isCorrect ? null : gradingResult.correctAnswer(),
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
        int earnedScore = correctCount;

        persistWrongProblems(user, session);
        persistStageAttemptLog(user, stage, correctCount, totalQuestionCount);
        updatePastExamBestScoreIfNeeded(user, stage, correctRate);

        Long nextStageId = resolveNextStageId(stage);
        boolean isTrackCompleted = nextStageId == null;

        if (stage.getTrack().getLearningMode() == CsTrackLearningMode.CURRICULUM) {
            updateDomainProgressIfNeeded(userId, stage, nextStageId);
        }
        StreakResult streak = applyStreak(user);
        if (earnedScore > 0) {
            user.addLeaguePoint(earnedScore);
        }
        int totalScore = safeInt(user.getLeaguePoint());

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
                earnedScore,
                totalScore,
                nextStageId);
    }

    private void persistStageAttemptLog(User user, CsStage stage, int correctCount, int totalQuestionCount) {
        CsStageAttemptLog attemptLog = CsStageAttemptLog.builder()
                .user(user)
                .domain(stage.getTrack().getDomain())
                .trackNo(stage.getTrack().getTrackNo())
                .stageNo(stage.getStageNo())
                .correctCount(correctCount)
                .totalCount(totalQuestionCount)
                .isReview(false)
                .completedAt(LocalDateTime.now())
                .build();

        csStageAttemptLogRepository.save(attemptLog);
    }

    private void updatePastExamBestScoreIfNeeded(User user, CsStage stage, int correctRate) {
        if (stage.getTrack().getLearningMode() != CsTrackLearningMode.PAST_EXAM) {
            return;
        }
        if (stage.getTrack().getExamYear() == null) {
            return;
        }

        Short examYear = stage.getTrack().getExamYear();
        Short examRound = stage.getStageNo();
        LocalDateTime now = LocalDateTime.now();

        CsPastExamBestScore bestScore = csPastExamBestScoreRepository
                .findByUser_IdAndExamYearAndExamRound(user.getId(), examYear, examRound)
                .orElseGet(() -> CsPastExamBestScore.builder()
                        .user(user)
                        .examYear(examYear)
                        .examRound(examRound)
                        .bestScore(correctRate)
                        .achievedAt(now)
                        .build());

        if (bestScore.getBestScore() == null || correctRate > bestScore.getBestScore()) {
            bestScore.updateBestScore(correctRate, now);
            csPastExamBestScoreRepository.save(bestScore);
            return;
        }

        if (correctRate == bestScore.getBestScore()) {
            bestScore.updateBestScore(correctRate, now);
            csPastExamBestScoreRepository.save(bestScore);
        }
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

    private GradingResult gradeAnswer(CsQuestion question, CsAttemptAnswerRequest request) {
        CsQuestionType questionType = question.getQuestionType();

        return switch (questionType) {
            case MULTIPLE_CHOICE, OX -> {
                Integer selectedChoiceNo = request.selectedChoiceNo();
                if (selectedChoiceNo == null || selectedChoiceNo <= 0) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "객관식/OX는 selectedChoiceNo가 필요합니다.");
                }

                List<CsQuestionChoice> choices = csQuestionChoiceRepository.findByQuestion_IdOrderByChoiceNoAsc(question.getId());
                if (choices.isEmpty()) {
                    throw new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND, "선택지가 존재하지 않는 문제입니다.");
                }

                CsQuestionChoice selectedChoice = choices.stream()
                        .filter(choice -> choice.getChoiceNo() != null
                                && choice.getChoiceNo().intValue() == selectedChoiceNo)
                        .findFirst()
                        .orElse(null);
                if (selectedChoice == null) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "존재하지 않는 선택지입니다.");
                }

                List<CsQuestionChoice> answerChoices = choices.stream()
                        .filter(choice -> Boolean.TRUE.equals(choice.getIsAnswer()))
                        .toList();
                if (answerChoices.size() != 1) {
                    throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "문제 정답 구성이 올바르지 않습니다.");
                }

                CsQuestionChoice answerChoice = answerChoices.get(0);
                boolean isCorrect = answerChoice.getChoiceNo().intValue() == selectedChoiceNo;
                String correctAnswer = answerChoice.getChoiceNo() + ". " + answerChoice.getContent();

                yield new GradingResult(
                        isCorrect,
                        (int) answerChoice.getChoiceNo(),
                        correctAnswer,
                        question.getExplanation());
            }
            case SHORT_ANSWER -> {
                String answerText = request.answerText();
                if (answerText == null || answerText.isBlank()) {
                    throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "단답형은 answerText가 필요합니다.");
                }

                List<CsQuestionShortAnswer> acceptableAnswers = csQuestionShortAnswerRepository
                        .findByQuestion_IdOrderByBlankIndexAscIsPrimaryDescIdAsc(question.getId());
                if (acceptableAnswers.isEmpty()) {
                    throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "단답형 정답 구성이 올바르지 않습니다.");
                }

                String submitted = answerText.strip();
                CsQuestionGradingMode gradingMode = resolveEffectiveGradingMode(question);

                if (isOrderedMultiBlankMode(gradingMode)) {
                    List<String> submittedParts = parseOrderedSubmittedAnswers(submitted);
                    List<String> expectedParts = resolveOrderedExpectedAnswers(question, acceptableAnswers);
                    boolean isCorrect = isOrderedAnswerCorrect(submittedParts, expectedParts);

                    yield new GradingResult(
                            isCorrect,
                            null,
                            isCorrect ? null : formatOrderedAnswerForFeedback(expectedParts),
                            question.getExplanation());
                }

                if (gradingMode == CsQuestionGradingMode.MULTI_BLANK_UNORDERED) {
                    List<String> submittedParts = parseOrderedSubmittedAnswers(submitted);
                    List<String> expectedParts = resolveOrderedExpectedAnswers(question, acceptableAnswers);
                    boolean isCorrect = isUnorderedAnswerCorrect(submittedParts, expectedParts);

                    yield new GradingResult(
                            isCorrect,
                            null,
                            isCorrect ? null : formatUnorderedAnswerForFeedback(expectedParts),
                            question.getExplanation());
                }

                String strictSubmitted = normalizeStrict(submitted);
                String relaxedSubmitted = normalizeRelaxed(strictSubmitted);

                Set<String> strictCandidates = new HashSet<>();
                Set<String> relaxedCandidates = new HashSet<>();

                for (CsQuestionShortAnswer acceptableAnswer : acceptableAnswers) {
                    addCandidateNormalization(strictCandidates, relaxedCandidates, acceptableAnswer.getNormalizedAnswer());
                    addCandidateNormalization(strictCandidates, relaxedCandidates, acceptableAnswer.getAnswerText());
                }

                boolean isCorrect = strictCandidates.contains(strictSubmitted)
                        || (!relaxedSubmitted.isBlank() && relaxedCandidates.contains(relaxedSubmitted));

                yield new GradingResult(
                        isCorrect,
                        null,
                        isCorrect ? null : resolvePrimaryShortAnswer(acceptableAnswers),
                        question.getExplanation());
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

    private List<CsQuestion> selectQuestionSet(List<CsQuestion> loadedQuestions, int attemptQuestionCount) {
        if (loadedQuestions.size() <= attemptQuestionCount) {
            return loadedQuestions;
        }
        return new ArrayList<>(loadedQuestions.subList(0, attemptQuestionCount));
    }

    private int resolveAttemptQuestionCount(CsStage stage, int loadedQuestionCount) {
        if (stage.getTrack().getLearningMode() == CsTrackLearningMode.PAST_EXAM) {
            return Math.min(loadedQuestionCount, PAST_EXAM_ATTEMPT_QUESTION_MAX_COUNT);
        }
        return Math.min(loadedQuestionCount, CURRICULUM_ATTEMPT_QUESTION_COUNT);
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
                question.getContentMode(),
                question.getContentBlocks(),
                question.getGradingMode(),
                question.getMetadata(),
                choices.isEmpty() ? null : choices);
    }

    private String buildFeedback(GradingResult gradingResult) {
        if (gradingResult.isCorrect()) {
            return "정답입니다.";
        }

        StringBuilder feedback = new StringBuilder();
        if (gradingResult.correctAnswer() != null && !gradingResult.correctAnswer().isBlank()) {
            feedback.append("정답: ").append(gradingResult.correctAnswer().trim());
        }
        if (gradingResult.explanation() != null && !gradingResult.explanation().isBlank()) {
            if (!feedback.isEmpty()) {
                feedback.append("\n");
            }
            feedback.append("해설: ").append(gradingResult.explanation().trim());
        }

        return feedback.isEmpty() ? "오답입니다." : feedback.toString();
    }

    private void addCandidateNormalization(Set<String> strictCandidates, Set<String> relaxedCandidates, String candidate) {
        String strictCandidate = normalizeStrict(candidate);
        if (strictCandidate.isBlank()) {
            return;
        }

        strictCandidates.add(strictCandidate);

        String relaxedCandidate = normalizeRelaxed(strictCandidate);
        if (!relaxedCandidate.isBlank()) {
            relaxedCandidates.add(relaxedCandidate);
        }
    }

    private String resolvePrimaryShortAnswer(List<CsQuestionShortAnswer> answers) {
        return answers.stream()
                .sorted(Comparator
                        .comparing((CsQuestionShortAnswer answer) -> !Boolean.TRUE.equals(answer.getIsPrimary()))
                        .thenComparing(CsQuestionShortAnswer::getId))
                .map(this::resolveDisplayAnswerText)
                .findFirst()
                .orElse(null);
    }

    private CsQuestionGradingMode resolveEffectiveGradingMode(CsQuestion question) {
        CsQuestionGradingMode gradingMode = question.getGradingMode();
        if (gradingMode == null || gradingMode == CsQuestionGradingMode.DEFAULT_BY_TYPE) {
            return question.getQuestionType() == CsQuestionType.SHORT_ANSWER
                    ? CsQuestionGradingMode.SHORT_TEXT_EXACT
                    : CsQuestionGradingMode.SINGLE_CHOICE;
        }
        return gradingMode;
    }

    private List<String> parseOrderedSubmittedAnswers(String submitted) {
        if (submitted == null || submitted.isBlank()) {
            return List.of();
        }
        if (submitted.contains(MULTI_BLANK_DELIMITER)) {
            String[] rawParts = submitted.split(Pattern.quote(MULTI_BLANK_DELIMITER));
            List<String> parts = new ArrayList<>();
            for (String rawPart : rawParts) {
                String normalized = rawPart == null ? "" : rawPart.trim();
                if (!normalized.isBlank()) {
                    parts.add(normalized);
                }
            }
            return parts;
        }
        return splitOrderedTokens(submitted);
    }

    private List<String> resolveOrderedExpectedAnswers(CsQuestion question, List<CsQuestionShortAnswer> acceptableAnswers) {
        List<CsQuestionShortAnswer> sortedAnswers = acceptableAnswers.stream()
                .sorted(Comparator
                        .comparing((CsQuestionShortAnswer answer) -> answer.getBlankIndex() == null
                                ? (short) 1
                                : answer.getBlankIndex())
                        .thenComparing((CsQuestionShortAnswer answer) -> !Boolean.TRUE.equals(answer.getIsPrimary()))
                        .thenComparing(CsQuestionShortAnswer::getId))
                .toList();

        List<String> groupedByBlank = resolveExpectedAnswersByBlankGroup(sortedAnswers);
        int expectedCount = extractExpectedBlankCount(question.getMetadata());
        if (groupedByBlank.size() > 1
                && (expectedCount <= 1 || groupedByBlank.size() == expectedCount)) {
            return groupedByBlank;
        }

        List<String> answerTexts = sortedAnswers.stream()
                .map(this::resolveDisplayAnswerText)
                .filter(text -> text != null && !text.isBlank())
                .map(String::trim)
                .toList();

        if (answerTexts.isEmpty()) {
            return List.of();
        }

        if (expectedCount > 1) {
            if (answerTexts.size() >= expectedCount) {
                return new ArrayList<>(answerTexts.subList(0, expectedCount));
            }

            List<String> splitPrimary = splitOrderedTokens(answerTexts.get(0));
            if (splitPrimary.size() >= expectedCount) {
                return new ArrayList<>(splitPrimary.subList(0, expectedCount));
            }
        }

        if (answerTexts.size() > 1) {
            return answerTexts;
        }

        List<String> splitSingle = splitOrderedTokens(answerTexts.get(0));
        return splitSingle.isEmpty() ? answerTexts : splitSingle;
    }

    private List<String> resolveExpectedAnswersByBlankGroup(List<CsQuestionShortAnswer> sortedAnswers) {
        Map<Short, List<String>> answersByBlank = new java.util.LinkedHashMap<>();
        for (CsQuestionShortAnswer answer : sortedAnswers) {
            String displayText = resolveDisplayAnswerText(answer);
            if (displayText == null || displayText.isBlank()) {
                continue;
            }
            short blankIndex = answer.getBlankIndex() == null ? 1 : answer.getBlankIndex();
            answersByBlank.computeIfAbsent(blankIndex, key -> new ArrayList<>())
                    .add(displayText.trim());
        }

        List<String> grouped = new ArrayList<>();
        for (List<String> candidates : answersByBlank.values()) {
            Set<String> seen = new HashSet<>();
            List<String> deduplicated = new ArrayList<>();
            for (String candidate : candidates) {
                String normalized = normalizeStrict(candidate);
                if (normalized.isBlank() || !seen.add(normalized)) {
                    continue;
                }
                deduplicated.add(candidate);
            }
            if (!deduplicated.isEmpty()) {
                grouped.add(String.join(" / ", deduplicated));
            }
        }
        return grouped;
    }

    private List<String> splitOrderedTokens(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String[] rawTokens = text.split("[,\\n;/]+");
        List<String> tokens = new ArrayList<>();
        for (String rawToken : rawTokens) {
            String normalized = rawToken == null ? "" : rawToken.trim();
            if (!normalized.isBlank()) {
                tokens.add(normalized);
            }
        }
        return tokens;
    }

    private boolean isOrderedAnswerCorrect(List<String> submittedParts, List<String> expectedParts) {
        if (submittedParts.isEmpty() || expectedParts.isEmpty()) {
            return false;
        }
        if (submittedParts.size() != expectedParts.size()) {
            return false;
        }

        for (int i = 0; i < expectedParts.size(); i++) {
            if (!isOrderedPartCorrect(submittedParts.get(i), expectedParts.get(i))) {
                return false;
            }
        }
        return true;
    }

    private boolean isUnorderedAnswerCorrect(List<String> submittedParts, List<String> expectedParts) {
        if (submittedParts.isEmpty() || expectedParts.isEmpty()) {
            return false;
        }
        if (submittedParts.size() != expectedParts.size()) {
            return false;
        }

        boolean[] used = new boolean[submittedParts.size()];
        return matchExpectedPart(expectedParts, submittedParts, used, 0);
    }

    private boolean matchExpectedPart(
            List<String> expectedParts,
            List<String> submittedParts,
            boolean[] used,
            int expectedIndex) {
        if (expectedIndex >= expectedParts.size()) {
            return true;
        }

        String expectedPart = expectedParts.get(expectedIndex);
        for (int submittedIndex = 0; submittedIndex < submittedParts.size(); submittedIndex++) {
            if (used[submittedIndex]) {
                continue;
            }
            if (!isOrderedPartCorrect(submittedParts.get(submittedIndex), expectedPart)) {
                continue;
            }

            used[submittedIndex] = true;
            if (matchExpectedPart(expectedParts, submittedParts, used, expectedIndex + 1)) {
                return true;
            }
            used[submittedIndex] = false;
        }
        return false;
    }

    private boolean isOrderedMultiBlankMode(CsQuestionGradingMode gradingMode) {
        return gradingMode == CsQuestionGradingMode.MULTI_BLANK_ORDERED
                || gradingMode == CsQuestionGradingMode.ORDERING;
    }

    private boolean isOrderedPartCorrect(String submittedPart, String expectedPart) {
        String strictSubmitted = normalizeStrict(submittedPart);
        String relaxedSubmitted = normalizeRelaxed(strictSubmitted);

        Set<String> strictCandidates = new HashSet<>();
        Set<String> relaxedCandidates = new HashSet<>();
        for (String option : parseExpectedPartOptions(expectedPart)) {
            addCandidateNormalization(strictCandidates, relaxedCandidates, option);
        }

        return strictCandidates.contains(strictSubmitted)
                || (!relaxedSubmitted.isBlank() && relaxedCandidates.contains(relaxedSubmitted));
    }

    private List<String> parseExpectedPartOptions(String expectedPart) {
        if (expectedPart == null || expectedPart.isBlank()) {
            return List.of();
        }
        String[] rawTokens = expectedPart.split("[|/]+");
        List<String> tokens = new ArrayList<>();
        for (String rawToken : rawTokens) {
            String normalized = rawToken == null ? "" : rawToken.trim();
            if (!normalized.isBlank()) {
                tokens.add(normalized);
            }
        }
        return tokens;
    }

    private int extractExpectedBlankCount(String metadata) {
        int blankCount = extractCount(metadata, BLANK_COUNT_PATTERN);
        if (blankCount > 0) {
            return blankCount;
        }
        return extractCount(metadata, ITEM_COUNT_PATTERN);
    }

    private int extractCount(String source, Pattern pattern) {
        if (source == null || source.isBlank()) {
            return 0;
        }
        Matcher matcher = pattern.matcher(source);
        if (!matcher.find()) {
            return 0;
        }
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private String formatOrderedAnswerForFeedback(List<String> expectedParts) {
        if (expectedParts == null || expectedParts.isEmpty()) {
            return null;
        }
        if (expectedParts.size() == 1) {
            return expectedParts.get(0);
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < expectedParts.size(); i++) {
            if (i > 0) {
                builder.append(", ");
            }
            builder.append("(").append(i + 1).append(") ").append(expectedParts.get(i));
        }
        return builder.toString();
    }

    private String formatUnorderedAnswerForFeedback(List<String> expectedParts) {
        if (expectedParts == null || expectedParts.isEmpty()) {
            return null;
        }
        return String.join(", ", expectedParts);
    }

    private String resolveDisplayAnswerText(CsQuestionShortAnswer answer) {
        if (answer.getAnswerText() != null && !answer.getAnswerText().isBlank()) {
            return answer.getAnswerText().trim();
        }
        if (answer.getNormalizedAnswer() != null && !answer.getNormalizedAnswer().isBlank()) {
            return answer.getNormalizedAnswer().trim();
        }
        return null;
    }

    private String normalizeStrict(String input) {
        if (input == null) {
            return "";
        }
        return input.strip()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "");
    }

    private String normalizeRelaxed(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        return input.replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private record StreakResult(boolean earnedToday, int currentStreak) {
    }

    private record GradingResult(
            boolean isCorrect,
            Integer correctChoiceNo,
            String correctAnswer,
            String explanation) {
    }
}
