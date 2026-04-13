package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsAdminDomainNameRequest;
import com.peekle.domain.cs.dto.request.CsAdminQuestionChoiceDraft;
import com.peekle.domain.cs.dto.request.CsAdminQuestionDraft;
import com.peekle.domain.cs.dto.request.CsAdminQuestionShortAnswerDraft;
import com.peekle.domain.cs.dto.request.CsAdminQuestionShortAnswersUpdateRequest;
import com.peekle.domain.cs.dto.request.CsAdminQuestionUpdateRequest;
import com.peekle.domain.cs.dto.request.CsAdminStageQuestionImportRequest;
import com.peekle.domain.cs.dto.request.CsAdminTrackCreateRequest;
import com.peekle.domain.cs.dto.response.CsAdminClaimItemResponse;
import com.peekle.domain.cs.dto.response.CsAdminClaimsPlaceholderResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionChoiceResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionImportResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionResponse;
import com.peekle.domain.cs.dto.response.CsAdminQuestionShortAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAdminTrackResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsQuestionShortAnswerRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.enums.UserRole;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsAdminContentService {

    private static final int DEFAULT_STAGE_COUNT_PER_TRACK = 10;
    private static final int REQUIRED_STAGE_QUESTION_COUNT = 10;

    private final CsDomainRepository csDomainRepository;
    private final CsDomainTrackRepository csDomainTrackRepository;
    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsQuestionShortAnswerRepository csQuestionShortAnswerRepository;
    private final UserRepository userRepository;

    public List<CsDomainResponse> getDomains(Long userId) {
        assertAdmin(userId);
        return csDomainRepository.findAllByOrderByIdAsc()
                .stream()
                .map(domain -> new CsDomainResponse(domain.getId(), domain.getName()))
                .toList();
    }

    @Transactional
    public CsDomainResponse createDomain(Long userId, CsAdminDomainNameRequest request) {
        assertAdmin(userId);
        int nextId = csDomainRepository.findTopByOrderByIdDesc()
                .map(CsDomain::getId)
                .orElse(0) + 1;

        CsDomain saved = csDomainRepository.save(CsDomain.builder()
                .id(nextId)
                .name(request.name().trim())
                .build());

        return new CsDomainResponse(saved.getId(), saved.getName());
    }

    @Transactional
    public CsDomainResponse renameDomain(Long userId, Integer domainId, CsAdminDomainNameRequest request) {
        assertAdmin(userId);
        CsDomain domain = getDomain(domainId);
        domain.rename(request.name().trim());
        return new CsDomainResponse(domain.getId(), domain.getName());
    }

    @Transactional
    public void deleteDomain(Long userId, Integer domainId) {
        assertAdmin(userId);
        CsDomain domain = getDomain(domainId);
        csDomainRepository.delete(domain);
    }

    public List<CsAdminTrackResponse> getTracks(Long userId, Integer domainId) {
        assertAdmin(userId);
        getDomain(domainId);

        List<CsDomainTrack> tracks = csDomainTrackRepository.findByDomain_IdOrderByTrackNoAsc(domainId);
        return tracks.stream()
                .map(this::toTrackResponse)
                .toList();
    }

    @Transactional
    public CsAdminTrackResponse createTrack(Long userId, Integer domainId, CsAdminTrackCreateRequest request) {
        assertAdmin(userId);
        CsDomain domain = getDomain(domainId);

        short nextTrackNo = (short) (csDomainTrackRepository.findTopByDomain_IdOrderByTrackNoDesc(domainId)
                .map(track -> (int) track.getTrackNo())
                .orElse(0) + 1);

        CsDomainTrack track = csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo(nextTrackNo)
                .name(request.name().trim())
                .build());

        List<Long> stageIds = new ArrayList<>(DEFAULT_STAGE_COUNT_PER_TRACK);
        for (short stageNo = 1; stageNo <= DEFAULT_STAGE_COUNT_PER_TRACK; stageNo++) {
            CsStage stage = csStageRepository.save(CsStage.builder()
                    .track(track)
                    .stageNo(stageNo)
                    .build());
            stageIds.add(stage.getId());
        }

        return new CsAdminTrackResponse(
                track.getId(),
                domainId,
                (int) track.getTrackNo(),
                track.getName(),
                stageIds);
    }

    @Transactional
    public CsAdminTrackResponse renameTrack(Long userId, Long trackId, CsAdminTrackCreateRequest request) {
        assertAdmin(userId);
        CsDomainTrack track = getTrack(trackId);
        track.rename(request.name().trim());
        return toTrackResponse(track);
    }

    public List<CsAdminQuestionResponse> getStageQuestions(Long userId, Long stageId) {
        assertAdmin(userId);
        getStage(stageId);
        return csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId)
                .stream()
                .map(this::toAdminQuestionResponse)
                .toList();
    }

    @Transactional
    public CsAdminQuestionImportResponse importStageQuestions(
            Long userId,
            Long stageId,
            CsAdminStageQuestionImportRequest request) {
        assertAdmin(userId);
        CsStage stage = getStage(stageId);
        ImportMode mode = ImportMode.from(request.mode());
        validateImportRequest(mode, request.questions());

        int createdCount = 0;
        int updatedCount = 0;
        int deactivatedCount = 0;

        List<CsQuestion> activeQuestions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId);
        if (mode == ImportMode.REPLACE) {
            for (CsQuestion question : activeQuestions) {
                question.deactivate();
                deactivatedCount++;
            }
        }

        for (CsAdminQuestionDraft draft : request.questions()) {
            CsQuestion target = null;
            if (mode == ImportMode.UPSERT && draft.questionId() != null) {
                target = csQuestionRepository.findByIdAndStage_Id(draft.questionId(), stageId).orElse(null);
            }

            if (target == null) {
                createQuestion(stage, draft);
                createdCount++;
            } else {
                updateQuestion(target, draft);
                updatedCount++;
            }
        }

        int totalActiveQuestions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId).size();
        return new CsAdminQuestionImportResponse(
                stageId,
                mode.name(),
                createdCount,
                updatedCount,
                deactivatedCount,
                totalActiveQuestions);
    }

    @Transactional
    public CsAdminQuestionResponse updateStageQuestion(
            Long userId,
            Long stageId,
            Long questionId,
            CsAdminQuestionUpdateRequest request) {
        assertAdmin(userId);
        getStage(stageId);

        CsQuestion question = csQuestionRepository.findByIdAndStage_Id(questionId, stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        CsAdminQuestionDraft draft = new CsAdminQuestionDraft(
                questionId,
                request.questionType(),
                request.prompt(),
                request.explanation(),
                request.choices(),
                request.shortAnswers());

        updateQuestion(question, draft);
        return toAdminQuestionResponse(question);
    }

    @Transactional
    public CsAdminQuestionResponse updateShortAnswers(
            Long userId,
            Long questionId,
            CsAdminQuestionShortAnswersUpdateRequest request) {
        assertAdmin(userId);
        CsQuestion question = csQuestionRepository.findById(questionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        if (question.getQuestionType() != CsQuestionType.SHORT_ANSWER) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "단답형 문제만 정답을 수정할 수 있습니다.");
        }

        List<CsAdminQuestionShortAnswerDraft> normalized = validateShortAnswers(request.shortAnswers());
        syncShortAnswers(question, normalized);

        return toAdminQuestionResponse(question);
    }

    public CsAdminClaimsPlaceholderResponse getStageClaims(Long userId, Long stageId) {
        assertAdmin(userId);
        getStage(stageId);

        return new CsAdminClaimsPlaceholderResponse(
                stageId,
                0,
                "문제 신고 내역 기능은 후속 이슈에서 제공됩니다.",
                List.<CsAdminClaimItemResponse>of());
    }

    private CsQuestion createQuestion(CsStage stage, CsAdminQuestionDraft draft) {
        validateDraftByType(draft);
        CsQuestion question = csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(draft.questionType())
                .prompt(draft.prompt().trim())
                .explanation(draft.explanation().trim())
                .isActive(true)
                .build());

        saveChildrenByType(question, draft);
        return question;
    }

    private void updateQuestion(CsQuestion question, CsAdminQuestionDraft draft) {
        validateDraftByType(draft);
        CsQuestionType previousType = question.getQuestionType();
        question.updateContent(
                draft.questionType(),
                draft.prompt().trim(),
                draft.explanation().trim());

        if (previousType != draft.questionType()) {
            csQuestionChoiceRepository.deleteByQuestionId(question.getId());
            csQuestionShortAnswerRepository.deleteByQuestionId(question.getId());
            saveChildrenByType(question, draft);
            return;
        }

        if (draft.questionType() == CsQuestionType.SHORT_ANSWER) {
            syncShortAnswers(question, validateShortAnswers(draft.shortAnswers()));
            return;
        }

        syncChoices(question, draft.choices());
    }

    private void saveChildrenByType(CsQuestion question, CsAdminQuestionDraft draft) {
        if (draft.questionType() == CsQuestionType.MULTIPLE_CHOICE || draft.questionType() == CsQuestionType.OX) {
            saveChoices(question, draft.choices());
            return;
        }
        saveShortAnswers(question, validateShortAnswers(draft.shortAnswers()));
    }

    private void saveChoices(CsQuestion question, List<CsAdminQuestionChoiceDraft> choices) {
        List<CsAdminQuestionChoiceDraft> sorted = new ArrayList<>(choices);
        sorted.sort(Comparator.comparingInt(CsAdminQuestionChoiceDraft::choiceNo));

        for (CsAdminQuestionChoiceDraft choice : sorted) {
            csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                    .question(question)
                    .choiceNo(choice.choiceNo().shortValue())
                    .content(choice.content().trim())
                    .isAnswer(choice.isAnswer())
                    .build());
        }
    }

    private void syncChoices(CsQuestion question, List<CsAdminQuestionChoiceDraft> choices) {
        List<CsQuestionChoice> existingChoices = csQuestionChoiceRepository.findByQuestion_IdOrderByChoiceNoAsc(question.getId());
        Map<Integer, CsQuestionChoice> existingByChoiceNo = new HashMap<>();
        for (CsQuestionChoice existingChoice : existingChoices) {
            existingByChoiceNo.put((int) existingChoice.getChoiceNo(), existingChoice);
        }

        List<CsAdminQuestionChoiceDraft> sorted = new ArrayList<>(choices);
        sorted.sort(Comparator.comparingInt(CsAdminQuestionChoiceDraft::choiceNo));

        for (CsAdminQuestionChoiceDraft choice : sorted) {
            int choiceNo = choice.choiceNo();
            CsQuestionChoice existing = existingByChoiceNo.remove(choiceNo);
            if (existing == null) {
                csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                        .question(question)
                        .choiceNo(choice.choiceNo().shortValue())
                        .content(choice.content().trim())
                        .isAnswer(choice.isAnswer())
                        .build());
                continue;
            }

            existing.update(choice.content().trim(), choice.isAnswer());
        }

        if (!existingByChoiceNo.isEmpty()) {
            csQuestionChoiceRepository.deleteAllInBatch(existingByChoiceNo.values());
        }
    }

    private void saveShortAnswers(CsQuestion question, List<CsAdminQuestionShortAnswerDraft> shortAnswers) {
        List<CsAdminQuestionShortAnswerDraft> normalizedDrafts = normalizePrimaryShortAnswers(shortAnswers);
        for (CsAdminQuestionShortAnswerDraft answer : normalizedDrafts) {
            csQuestionShortAnswerRepository.save(CsQuestionShortAnswer.builder()
                    .question(question)
                    .answerText(answer.answerText().trim())
                    .normalizedAnswer(normalizeStrict(answer.answerText()))
                    .isPrimary(Boolean.TRUE.equals(answer.isPrimary()))
                    .build());
        }
    }

    private void syncShortAnswers(CsQuestion question, List<CsAdminQuestionShortAnswerDraft> shortAnswers) {
        List<CsAdminQuestionShortAnswerDraft> normalizedDrafts = normalizePrimaryShortAnswers(shortAnswers);
        List<CsQuestionShortAnswer> existingAnswers = csQuestionShortAnswerRepository
                .findByQuestion_IdOrderByIsPrimaryDescIdAsc(question.getId());

        Map<String, CsQuestionShortAnswer> existingByNormalized = new HashMap<>();
        for (CsQuestionShortAnswer existingAnswer : existingAnswers) {
            existingByNormalized.put(existingAnswer.getNormalizedAnswer(), existingAnswer);
        }

        for (CsAdminQuestionShortAnswerDraft answer : normalizedDrafts) {
            String normalized = normalizeStrict(answer.answerText());
            CsQuestionShortAnswer existing = existingByNormalized.remove(normalized);
            if (existing == null) {
                csQuestionShortAnswerRepository.save(CsQuestionShortAnswer.builder()
                        .question(question)
                        .answerText(answer.answerText().trim())
                        .normalizedAnswer(normalized)
                        .isPrimary(Boolean.TRUE.equals(answer.isPrimary()))
                        .build());
                continue;
            }

            existing.update(
                    answer.answerText().trim(),
                    normalized,
                    Boolean.TRUE.equals(answer.isPrimary()));
        }

        if (!existingByNormalized.isEmpty()) {
            csQuestionShortAnswerRepository.deleteAllInBatch(existingByNormalized.values());
        }
    }

    private void validateDraftByType(CsAdminQuestionDraft draft) {
        if (draft == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "문제 데이터가 비어 있습니다.");
        }
        if (draft.questionType() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "questionType은 필수입니다.");
        }
        String prompt = draft.prompt() == null ? "" : draft.prompt().trim();
        if (prompt.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "prompt는 필수입니다.");
        }
        String explanation = draft.explanation() == null ? "" : draft.explanation().trim();
        if (explanation.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "explanation은 필수입니다.");
        }

        if (draft.questionType() == CsQuestionType.MULTIPLE_CHOICE) {
            validateChoices(draft.choices(), false);
            return;
        }
        if (draft.questionType() == CsQuestionType.OX) {
            validateChoices(draft.choices(), true);
            return;
        }
        validateShortAnswers(draft.shortAnswers());
    }

    private void validateChoices(List<CsAdminQuestionChoiceDraft> choices, boolean ox) {
        if (choices == null || choices.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "객관식/OX 문제는 choices가 필요합니다.");
        }
        if (ox && choices.size() != 2) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "OX 문제는 선택지가 정확히 2개여야 합니다.");
        }
        if (!ox && choices.size() < 2) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "객관식 문제는 선택지가 2개 이상이어야 합니다.");
        }

        int answerCount = 0;
        Set<Integer> choiceNos = new HashSet<>();
        for (CsAdminQuestionChoiceDraft choice : choices) {
            if (choice == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "choice 항목이 비어 있습니다.");
            }
            if (choice.choiceNo() == null || choice.choiceNo() <= 0) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "choiceNo는 1 이상의 값이어야 합니다.");
            }
            String content = choice.content() == null ? "" : choice.content().trim();
            if (content.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "선택지 content는 비어 있을 수 없습니다.");
            }
            if (choice.isAnswer() == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "isAnswer는 필수입니다.");
            }
            if (!choiceNos.add(choice.choiceNo())) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "choiceNo는 중복될 수 없습니다.");
            }
            if (Boolean.TRUE.equals(choice.isAnswer())) {
                answerCount++;
            }
        }
        if (answerCount != 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "정답 선택지는 정확히 1개여야 합니다.");
        }
    }

    private List<CsAdminQuestionShortAnswerDraft> validateShortAnswers(List<CsAdminQuestionShortAnswerDraft> shortAnswers) {
        if (shortAnswers == null || shortAnswers.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "단답형 문제는 shortAnswers가 1개 이상 필요합니다.");
        }

        Set<String> normalizedSet = new HashSet<>();
        List<CsAdminQuestionShortAnswerDraft> normalized = new ArrayList<>(shortAnswers.size());
        for (CsAdminQuestionShortAnswerDraft answer : shortAnswers) {
            String trimmed = answer.answerText() == null ? "" : answer.answerText().trim();
            if (trimmed.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "shortAnswers.answerText는 비어 있을 수 없습니다.");
            }

            String normalizedAnswer = normalizeStrict(trimmed);
            if (!normalizedSet.add(normalizedAnswer)) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "단답형 정답은 중복될 수 없습니다.");
            }

            normalized.add(new CsAdminQuestionShortAnswerDraft(trimmed, answer.isPrimary()));
        }
        return normalized;
    }

    private void validateImportRequest(ImportMode mode, List<CsAdminQuestionDraft> questions) {
        if (questions == null || questions.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "questions는 최소 1개 이상 필요합니다.");
        }

        if (mode == ImportMode.REPLACE && questions.size() != REQUIRED_STAGE_QUESTION_COUNT) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    "전체 교체(REPLACE)는 문제가 정확히 " + REQUIRED_STAGE_QUESTION_COUNT + "개여야 합니다.");
        }

        Set<Long> upsertQuestionIds = new HashSet<>();
        for (int i = 0; i < questions.size(); i++) {
            CsAdminQuestionDraft draft = questions.get(i);
            try {
                validateDraftByType(draft);
            } catch (BusinessException ex) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        (i + 1) + "번 문제: " + ex.getMessage());
            }

            if (mode == ImportMode.UPSERT && draft.questionId() != null && !upsertQuestionIds.add(draft.questionId())) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        "UPSERT에서는 questionId가 중복될 수 없습니다.");
            }
        }
    }

    private List<CsAdminQuestionShortAnswerDraft> normalizePrimaryShortAnswers(
            List<CsAdminQuestionShortAnswerDraft> shortAnswers) {
        List<CsAdminQuestionShortAnswerDraft> normalizedDrafts = new ArrayList<>(shortAnswers.size());
        boolean hasPrimary = shortAnswers.stream()
                .anyMatch(answer -> Boolean.TRUE.equals(answer.isPrimary()));

        for (int i = 0; i < shortAnswers.size(); i++) {
            CsAdminQuestionShortAnswerDraft answer = shortAnswers.get(i);
            boolean isPrimary = hasPrimary
                    ? Boolean.TRUE.equals(answer.isPrimary())
                    : i == 0;

            normalizedDrafts.add(new CsAdminQuestionShortAnswerDraft(
                    answer.answerText().trim(),
                    isPrimary));
        }
        return normalizedDrafts;
    }

    private CsAdminQuestionResponse toAdminQuestionResponse(CsQuestion question) {
        List<CsAdminQuestionChoiceResponse> choices = csQuestionChoiceRepository
                .findByQuestion_IdOrderByChoiceNoAsc(question.getId())
                .stream()
                .map(choice -> new CsAdminQuestionChoiceResponse(
                        (int) choice.getChoiceNo(),
                        choice.getContent(),
                        choice.getIsAnswer()))
                .toList();

        List<CsAdminQuestionShortAnswerResponse> shortAnswers = csQuestionShortAnswerRepository
                .findByQuestion_IdOrderByIsPrimaryDescIdAsc(question.getId())
                .stream()
                .map(answer -> new CsAdminQuestionShortAnswerResponse(
                        answer.getId(),
                        answer.getAnswerText(),
                        answer.getNormalizedAnswer(),
                        answer.getIsPrimary()))
                .toList();

        return new CsAdminQuestionResponse(
                question.getId(),
                question.getQuestionType(),
                question.getPrompt(),
                question.getExplanation(),
                question.getIsActive(),
                choices,
                shortAnswers);
    }

    private CsDomain getDomain(Integer domainId) {
        return csDomainRepository.findById(domainId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_FOUND));
    }

    private CsDomainTrack getTrack(Long trackId) {
        return csDomainTrackRepository.findById(trackId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_TRACK_NOT_FOUND));
    }

    private CsStage getStage(Long stageId) {
        return csStageRepository.findByIdWithTrackAndDomain(stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_STAGE_NOT_FOUND));
    }

    private CsAdminTrackResponse toTrackResponse(CsDomainTrack track) {
        return new CsAdminTrackResponse(
                track.getId(),
                track.getDomain().getId(),
                (int) track.getTrackNo(),
                track.getName(),
                csStageRepository.findByTrack_IdOrderByStageNoAsc(track.getId())
                        .stream()
                        .map(CsStage::getId)
                        .toList());
    }

    private void assertAdmin(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.getRole() != UserRole.ADMIN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "CS 콘텐츠 관리자 권한이 없습니다.");
        }
    }

    private String normalizeStrict(String input) {
        if (input == null) {
            return "";
        }
        return input.strip()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "");
    }

    private enum ImportMode {
        REPLACE,
        UPSERT;

        static ImportMode from(String raw) {
            if (raw == null || raw.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "mode는 REPLACE 또는 UPSERT여야 합니다.");
            }

            try {
                return ImportMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "mode는 REPLACE 또는 UPSERT여야 합니다.");
            }
        }
    }
}
