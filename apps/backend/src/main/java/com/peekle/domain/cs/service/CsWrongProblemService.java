package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsWrongReviewAnswerRequest;
import com.peekle.domain.cs.dto.request.CsWrongReviewStartRequest;
import com.peekle.domain.cs.dto.response.CsAttemptProgressResponse;
import com.peekle.domain.cs.dto.response.CsQuestionChoiceResponse;
import com.peekle.domain.cs.dto.response.CsQuestionPayloadResponse;
import com.peekle.domain.cs.dto.response.CsWrongProblemItemResponse;
import com.peekle.domain.cs.dto.response.CsWrongProblemPageResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewAnswerResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewCompleteResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewStartResponse;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsQuestionShortAnswerRepository;
import com.peekle.domain.cs.repository.CsWrongProblemRepository;
import com.peekle.domain.cs.service.store.CsWrongReviewSession;
import com.peekle.domain.cs.service.store.CsWrongReviewStore;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsWrongProblemService {

    private static final int MAX_REVIEW_QUESTION_COUNT = 10;
    private static final int DEFAULT_REVIEW_QUESTION_COUNT = 10;
    private static final int CLEAR_THRESHOLD = 1;
    private static final int MESSAGE_SCORE_EXCELLENT = 90;
    private static final int MESSAGE_SCORE_GOOD = 70;
    private static final String MULTI_BLANK_DELIMITER = "|||";
    private static final Pattern BLANK_COUNT_PATTERN = Pattern.compile("\"blankCount\"\\s*:\\s*(\\d+)");
    private static final Pattern ITEM_COUNT_PATTERN = Pattern.compile("\"itemCount\"\\s*:\\s*(\\d+)");

    private final CsWrongProblemRepository csWrongProblemRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsQuestionShortAnswerRepository csQuestionShortAnswerRepository;
    private final CsWrongReviewStore csWrongReviewStore;
    private final UserRepository userRepository;

    public CsWrongProblemPageResponse getWrongProblems(
            Long userId,
            Integer domainId,
            Long stageId,
            CsWrongProblemStatus status,
            int page,
            int size) {
        getUser(userId);

        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, 100));
        CsWrongProblemStatus resolvedStatus = status == null ? CsWrongProblemStatus.ACTIVE : status;

        Page<CsWrongProblem> resultPage = csWrongProblemRepository.findPagedByUserAndFilters(
                userId,
                resolvedStatus,
                domainId,
                stageId,
                PageRequest.of(normalizedPage, normalizedSize));

        List<CsWrongProblemItemResponse> content = resultPage.getContent().stream()
                .map(this::toWrongProblemItemResponse)
                .toList();

        return new CsWrongProblemPageResponse(
                content,
                normalizedPage,
                normalizedSize,
                resultPage.getTotalElements());
    }

    @Transactional
    public CsWrongReviewStartResponse startWrongReview(Long userId, CsWrongReviewStartRequest request) {
        getUser(userId);

        Integer domainId = request == null ? null : request.domainId();
        Long stageId = request == null ? null : request.stageId();
        int requestedCount = request != null && request.questionCount() != null
                ? request.questionCount()
                : DEFAULT_REVIEW_QUESTION_COUNT;
        int reviewQuestionCount = Math.max(1, Math.min(requestedCount, MAX_REVIEW_QUESTION_COUNT));

        List<CsWrongProblem> candidates = new ArrayList<>(csWrongProblemRepository.findCandidatesForReview(
                userId,
                CsWrongProblemStatus.ACTIVE,
                domainId,
                stageId));

        if (candidates.isEmpty()) {
            return new CsWrongReviewStartResponse(null, 0, null);
        }

        Collections.shuffle(candidates);
        List<Long> selectedQuestionIds = candidates.stream()
                .limit(reviewQuestionCount)
                .map(wrongProblem -> wrongProblem.getQuestion().getId())
                .toList();

        String reviewId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        CsWrongReviewSession session = CsWrongReviewSession.builder()
                .reviewId(reviewId)
                .userId(userId)
                .domainId(domainId)
                .stageId(stageId)
                .questionOrder(selectedQuestionIds)
                .currentIndex(0)
                .correctCount(0)
                .clearedCount(0)
                .latestCorrectByQuestionId(new HashMap<>())
                .completed(false)
                .startedAt(now)
                .updatedAt(now)
                .build();
        csWrongReviewStore.save(session);

        Long firstQuestionId = selectedQuestionIds.get(0);
        CsQuestion firstQuestion = csQuestionRepository.findByIdAndIsActiveTrue(firstQuestionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        return new CsWrongReviewStartResponse(
                reviewId,
                selectedQuestionIds.size(),
                toQuestionPayload(firstQuestion));
    }

    @Transactional
    public CsWrongReviewAnswerResponse submitWrongReviewAnswer(
            Long userId,
            String reviewId,
            CsWrongReviewAnswerRequest request) {
        User user = getUser(userId);
        CsWrongReviewSession session = getReviewSession(userId, reviewId);

        if (Boolean.TRUE.equals(session.getCompleted())) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "이미 완료된 복습 세션입니다.");
        }

        List<Long> questionOrder = session.getQuestionOrder();
        int currentIndex = safeInt(session.getCurrentIndex());
        if (questionOrder == null || questionOrder.isEmpty() || currentIndex >= questionOrder.size()) {
            throw new BusinessException(ErrorCode.CS_ATTEMPT_EXPIRED, "유효하지 않은 복습 세션 상태입니다.");
        }

        Long expectedQuestionId = questionOrder.get(currentIndex);
        if (!expectedQuestionId.equals(request.questionId())) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "현재 순서의 문제를 제출해야 합니다.");
        }

        CsQuestion question = csQuestionRepository.findByIdAndIsActiveTrue(request.questionId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        GradingResult gradingResult = gradeAnswer(question, request.selectedChoiceNo(), request.answerText());
        boolean isCorrect = gradingResult.isCorrect();

        applyWrongProblemState(user, question, session, isCorrect);

        if (isCorrect) {
            session.setCorrectCount(safeInt(session.getCorrectCount()) + 1);
        }
        session.getLatestCorrectByQuestionId().put(question.getId(), isCorrect);

        int currentQuestionNo = currentIndex + 1;
        int totalQuestionCount = questionOrder.size();

        int nextIndex = currentIndex + 1;
        if (nextIndex >= totalQuestionCount) {
            session.setCurrentIndex(nextIndex);
            session.setCompleted(true);
        } else {
            session.setCurrentIndex(nextIndex);
        }

        session.setUpdatedAt(LocalDateTime.now());
        csWrongReviewStore.save(session);

        boolean isLast = Boolean.TRUE.equals(session.getCompleted());
        CsQuestionPayloadResponse nextQuestion = null;
        if (!isLast) {
            Long nextQuestionId = session.getQuestionOrder().get(session.getCurrentIndex());
            CsQuestion next = csQuestionRepository.findByIdAndIsActiveTrue(nextQuestionId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));
            nextQuestion = toQuestionPayload(next);
        }

        return new CsWrongReviewAnswerResponse(
                session.getReviewId(),
                question.getId(),
                question.getQuestionType(),
                new CsAttemptProgressResponse(currentQuestionNo, totalQuestionCount),
                isCorrect,
                buildFeedback(gradingResult),
                isCorrect ? null : gradingResult.correctChoiceNo(),
                isCorrect ? null : gradingResult.correctAnswer(),
                isLast,
                nextQuestion);
    }

    @Transactional
    public CsWrongReviewCompleteResponse completeWrongReview(Long userId, String reviewId) {
        getUser(userId);
        CsWrongReviewSession session = getReviewSession(userId, reviewId);

        if (!Boolean.TRUE.equals(session.getCompleted())) {
            throw new BusinessException(ErrorCode.CS_INVALID_ANSWER_PAYLOAD, "아직 복습이 완료되지 않았습니다.");
        }

        int totalQuestionCount = session.getQuestionOrder() == null ? 0 : session.getQuestionOrder().size();
        int correctCount = safeInt(session.getCorrectCount());
        int wrongCount = Math.max(totalQuestionCount - correctCount, 0);
        int correctRate = totalQuestionCount == 0
                ? 0
                : (int) Math.round((correctCount * 100.0) / totalQuestionCount);

        List<Long> questionIds = session.getQuestionOrder() == null ? List.of() : session.getQuestionOrder();
        int remainedActiveCount = questionIds.isEmpty()
                ? 0
                : (int) csWrongProblemRepository.countByUserAndStatusAndQuestionIds(
                        userId,
                        CsWrongProblemStatus.ACTIVE,
                        questionIds);

        int clearedCount = safeInt(session.getClearedCount());
        csWrongReviewStore.delete(userId, reviewId);

        return new CsWrongReviewCompleteResponse(
                reviewId,
                totalQuestionCount,
                correctRate,
                correctCount,
                wrongCount,
                resolveMessageCode(correctRate),
                clearedCount,
                remainedActiveCount);
    }

    private void applyWrongProblemState(
            User user,
            CsQuestion question,
            CsWrongReviewSession session,
            boolean isCorrect) {
        CsWrongProblem wrongProblem = csWrongProblemRepository
                .findByUser_IdAndQuestion_Id(user.getId(), question.getId())
                .orElseGet(() -> buildNewWrongProblem(user, question));

        if (isCorrect) {
            CsWrongProblemStatus beforeStatus = wrongProblem.getStatus();
            wrongProblem.increaseWrongCount();
            wrongProblem.markCorrectReview(CLEAR_THRESHOLD);
            if (beforeStatus != CsWrongProblemStatus.CLEARED
                    && wrongProblem.getStatus() == CsWrongProblemStatus.CLEARED) {
                session.setClearedCount(safeInt(session.getClearedCount()) + 1);
            }
        } else {
            wrongProblem.markWrong();
        }

        csWrongProblemRepository.save(wrongProblem);
    }

    private CsWrongProblem buildNewWrongProblem(User user, CsQuestion question) {
        LocalDateTime now = LocalDateTime.now();
        return CsWrongProblem.builder()
                .user(user)
                .question(question)
                .domain(question.getStage().getTrack().getDomain())
                .status(CsWrongProblemStatus.ACTIVE)
                .wrongCount(0)
                .reviewCorrectCount(0)
                .lastWrongAt(now)
                .updatedAt(now)
                .build();
    }

    private CsWrongReviewSession getReviewSession(Long userId, String reviewId) {
        return csWrongReviewStore.find(userId, reviewId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.CS_ATTEMPT_NOT_FOUND,
                        "진행 중인 오답 복습 세션을 찾을 수 없습니다."));
    }

    private CsWrongProblemItemResponse toWrongProblemItemResponse(CsWrongProblem wrongProblem) {
        CsQuestion question = wrongProblem.getQuestion();
        var stage = question.getStage();
        var track = stage.getTrack();
        var domain = track.getDomain();

        return new CsWrongProblemItemResponse(
                question.getId(),
                question.getQuestionType(),
                question.getPrompt(),
                resolveQuestionAnswerText(question),
                domain.getId(),
                domain.getName(),
                (int) track.getTrackNo(),
                stage.getId(),
                (int) stage.getStageNo(),
                wrongProblem.getStatus(),
                wrongProblem.getLastWrongAt(),
                wrongProblem.getClearedAt());
    }

    private String resolveQuestionAnswerText(CsQuestion question) {
        if (question.getQuestionType() == CsQuestionType.MULTIPLE_CHOICE
                || question.getQuestionType() == CsQuestionType.OX) {
            return csQuestionChoiceRepository.findByQuestion_IdOrderByChoiceNoAsc(question.getId())
                    .stream()
                    .filter(choice -> Boolean.TRUE.equals(choice.getIsAnswer()))
                    .findFirst()
                    .map(choice -> choice.getChoiceNo() + ". " + choice.getContent())
                    .orElse(null);
        }

        if (question.getQuestionType() == CsQuestionType.SHORT_ANSWER) {
            List<CsQuestionShortAnswer> answers = csQuestionShortAnswerRepository
                    .findByQuestion_IdOrderByBlankIndexAscIsPrimaryDescIdAsc(question.getId());
            if (answers.isEmpty()) {
                return null;
            }
            return resolveShortAnswerDisplay(question, answers);
        }

        return null;
    }

    private GradingResult gradeAnswer(CsQuestion question, Integer selectedChoiceNo, String answerText) {
        CsQuestionType questionType = question.getQuestionType();

        return switch (questionType) {
            case MULTIPLE_CHOICE, OX -> {
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

    private String resolveMessageCode(int correctRate) {
        if (correctRate >= MESSAGE_SCORE_EXCELLENT) {
            return "CS_RESULT_EXCELLENT";
        }
        if (correctRate >= MESSAGE_SCORE_GOOD) {
            return "CS_RESULT_GOOD";
        }
        return "CS_RESULT_KEEP_GOING";
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

    private String resolveShortAnswerDisplay(CsQuestion question, List<CsQuestionShortAnswer> answers) {
        CsQuestionGradingMode gradingMode = resolveEffectiveGradingMode(question);
        if (isOrderedMultiBlankMode(gradingMode)) {
            return formatOrderedAnswerForFeedback(resolveOrderedExpectedAnswers(question, answers));
        }
        if (gradingMode == CsQuestionGradingMode.MULTI_BLANK_UNORDERED) {
            return formatUnorderedAnswerForFeedback(resolveOrderedExpectedAnswers(question, answers));
        }
        return answers.stream()
                .sorted(Comparator
                        .comparing((CsQuestionShortAnswer answer) -> !Boolean.TRUE.equals(answer.getIsPrimary()))
                        .thenComparing(CsQuestionShortAnswer::getId))
                .map(this::resolveDisplayAnswerText)
                .filter(answer -> answer != null && !answer.isBlank())
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

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private record GradingResult(
            boolean isCorrect,
            Integer correctChoiceNo,
            String correctAnswer,
            String explanation) {
    }
}
