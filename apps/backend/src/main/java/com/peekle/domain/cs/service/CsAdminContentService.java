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
import com.peekle.domain.cs.dto.response.CsAdminStageSummaryResponse;
import com.peekle.domain.cs.dto.response.CsAdminTrackResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionClaim;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.enums.CsQuestionContentMode;
import com.peekle.domain.cs.enums.CsQuestionGradingMode;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionClaimRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsQuestionShortAnswerRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.enums.UserRole;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.storage.R2StorageService;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsAdminContentService {

    private static final int DEFAULT_STAGE_COUNT_PER_TRACK = 5;
    private static final int MAX_STAGE_COUNT_PER_TRACK = 20;
    private static final int CURRICULUM_REQUIRED_STAGE_QUESTION_COUNT = 10;
    private static final int PAST_EXAM_MAX_STAGE_QUESTION_COUNT = 20;
    private static final int PAST_EXAM_MIN_YEAR = 2020;
    private static final int PAST_EXAM_MAX_YEAR = 2025;
    private static final short DEFAULT_SHORT_ANSWER_BLANK_INDEX = 1;
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif");

    private final CsDomainRepository csDomainRepository;
    private final CsDomainTrackRepository csDomainTrackRepository;
    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsQuestionClaimRepository csQuestionClaimRepository;
    private final CsQuestionShortAnswerRepository csQuestionShortAnswerRepository;
    private final CsUserDomainProgressRepository csUserDomainProgressRepository;
    private final UserRepository userRepository;
    private final R2StorageService r2StorageService;

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
        CsTrackLearningMode learningMode = resolveLearningMode(request.learningMode());
        Short examYear = resolveExamYear(learningMode, request.examYear());
        validatePastExamTrackUniqueness(domainId, learningMode, examYear, null);
        int stageCount = resolveRequestedStageCount(learningMode, examYear, request.stageCount());

        short nextTrackNo = (short) (csDomainTrackRepository.findTopByDomain_IdOrderByTrackNoDesc(domainId)
                .map(track -> (int) track.getTrackNo())
                .orElse(0) + 1);

        CsDomainTrack track = csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo(nextTrackNo)
                .name(request.name().trim())
                .learningMode(learningMode)
                .examYear(examYear)
                .build());

        List<CsAdminStageSummaryResponse> stages = new ArrayList<>(stageCount);
        for (short stageNo = 1; stageNo <= stageCount; stageNo++) {
            CsStage savedStage = csStageRepository.save(CsStage.builder()
                    .track(track)
                    .stageNo(stageNo)
                    .build());
            stages.add(new CsAdminStageSummaryResponse(savedStage.getId(), (int) savedStage.getStageNo()));
        }

        return new CsAdminTrackResponse(
                track.getId(),
                domainId,
                domain.getName(),
                (int) track.getTrackNo(),
                track.getName(),
                track.getLearningMode(),
                track.getExamYear() == null ? null : (int) track.getExamYear(),
                stages);
    }

    @Transactional
    public CsAdminTrackResponse renameTrack(Long userId, Long trackId, CsAdminTrackCreateRequest request) {
        assertAdmin(userId);
        CsDomainTrack track = getTrack(trackId);
        CsTrackLearningMode learningMode = request.learningMode() == null
                ? track.getLearningMode()
                : resolveLearningMode(request.learningMode());
        Integer requestedExamYear = request.learningMode() == null
                ? (track.getExamYear() == null ? null : (int) track.getExamYear())
                : request.examYear();
        Short examYear = resolveExamYear(learningMode, requestedExamYear);
        validatePastExamTrackUniqueness(track.getDomain().getId(), learningMode, examYear, track.getId());
        track.rename(request.name().trim());
        track.updateLearningMode(learningMode, examYear);
        return toTrackResponse(track);
    }

    @Transactional
    public void deleteTrack(Long userId, Long trackId) {
        assertAdmin(userId);
        CsDomainTrack track = getTrack(trackId);
        Integer domainId = track.getDomain().getId();
        short deletedTrackNo = track.getTrackNo();

        List<CsDomainTrack> tracks = csDomainTrackRepository.findByDomain_IdOrderByTrackNoAsc(domainId);
        if (tracks.size() <= 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "도메인에는 최소 1개의 트랙이 필요합니다.");
        }

        csDomainTrackRepository.delete(track);

        List<CsDomainTrack> remainingTracks = csDomainTrackRepository.findByDomain_IdOrderByTrackNoAsc(domainId);
        resequenceTracks(remainingTracks);

        short maxTrackNo = (short) remainingTracks.size();
        Map<Short, Short> maxStageNoByTrackNo = resolveMaxStageNoByTrackNo(remainingTracks);
        List<CsUserDomainProgress> progresses = csUserDomainProgressRepository.findByDomain_Id(domainId);
        for (CsUserDomainProgress progress : progresses) {
            short nextTrackNo = resolveTrackNoAfterDeletion(progress.getCurrentTrackNo(), deletedTrackNo, maxTrackNo);
            short nextStageNo = clampStageNo(
                    progress.getCurrentStageNo(),
                    maxStageNoByTrackNo.getOrDefault(nextTrackNo, (short) 1));

            if (progress.getCurrentTrackNo() != nextTrackNo || progress.getCurrentStageNo() != nextStageNo) {
                progress.advanceTo(nextTrackNo, nextStageNo);
            }
        }
    }

    @Transactional
    public void deleteStage(Long userId, Long stageId) {
        assertAdmin(userId);
        CsStage stage = getStage(stageId);
        Long trackId = stage.getTrack().getId();
        Integer domainId = stage.getTrack().getDomain().getId();
        short trackNo = stage.getTrack().getTrackNo();
        short deletedStageNo = stage.getStageNo();

        List<CsStage> stages = csStageRepository.findByTrack_IdOrderByStageNoAsc(trackId);
        if (stages.size() <= 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "트랙에는 최소 1개의 스테이지가 필요합니다.");
        }

        csStageRepository.delete(stage);

        List<CsStage> remainingStages = csStageRepository.findByTrack_IdOrderByStageNoAsc(trackId);
        resequenceStages(remainingStages);

        short maxStageNo = (short) remainingStages.size();
        List<CsUserDomainProgress> progresses = csUserDomainProgressRepository.findByDomain_IdAndCurrentTrackNo(domainId, trackNo);
        for (CsUserDomainProgress progress : progresses) {
            short nextStageNo = resolveStageNoAfterDeletion(progress.getCurrentStageNo(), deletedStageNo, maxStageNo);
            if (progress.getCurrentStageNo() != nextStageNo) {
                progress.advanceTo(progress.getCurrentTrackNo(), nextStageNo);
            }
        }
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
        List<CsQuestion> activeQuestions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId);
        validateImportRequest(stage, mode, request.questions(), activeQuestions);

        int createdCount = 0;
        int updatedCount = 0;
        int deactivatedCount = 0;

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
                request.contentMode(),
                request.contentBlocks(),
                request.gradingMode(),
                request.metadata(),
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

        List<CsAdminQuestionShortAnswerDraft> normalized = validateShortAnswers(
                request.shortAnswers(),
                resolveEffectiveGradingMode(question));
        syncShortAnswers(question, normalized);

        return toAdminQuestionResponse(question);
    }

    public CsAdminClaimsPlaceholderResponse getStageClaims(Long userId, Long stageId) {
        assertAdmin(userId);
        getStage(stageId);

        List<CsAdminClaimItemResponse> items = csQuestionClaimRepository.findByStage_IdOrderByCreatedAtDesc(stageId)
                .stream()
                .map(this::toClaimItemResponse)
                .toList();

        return new CsAdminClaimsPlaceholderResponse(
                stageId,
                items.size(),
                items.isEmpty() ? "등록된 신고 내역이 없습니다." : "최신 신고 내역입니다.",
                items);
    }

    private CsAdminClaimItemResponse toClaimItemResponse(CsQuestionClaim claim) {
        return new CsAdminClaimItemResponse(
                String.valueOf(claim.getId()),
                claim.getQuestion().getId(),
                "[" + toClaimTypeLabel(claim) + "] " + claim.getDescription(),
                claim.getStatus().name(),
                claim.getCreatedAt() == null ? "" : claim.getCreatedAt().toString());
    }

    private String toClaimTypeLabel(CsQuestionClaim claim) {
        return switch (claim.getClaimType()) {
            case INCORRECT_ANSWER -> "정답 오류";
            case INCORRECT_EXPLANATION -> "해설 오류";
            case QUESTION_TEXT_ERROR -> "문항 오류/모호함";
            case OTHER -> "기타";
        };
    }

    public Map<String, String> getQuestionImagePresignedUrl(Long userId, String fileName, String contentType) {
        assertAdmin(userId);

        String normalizedContentType = normalizeOptionalText(contentType);
        if (normalizedContentType == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "contentType은 필수입니다.");
        }
        normalizedContentType = normalizedContentType.toLowerCase(Locale.ROOT);
        if (!ALLOWED_IMAGE_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "지원하지 않는 이미지 형식입니다.");
        }

        String sanitizedFileName = sanitizeFileName(fileName);
        if (sanitizedFileName.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "fileName은 필수입니다.");
        }

        String objectKey = "cs/questions/"
                + userId
                + "/"
                + System.currentTimeMillis()
                + "_"
                + UUID.randomUUID()
                + "_"
                + sanitizedFileName;

        String presignedUrl = r2StorageService.generatePresignedUrl(objectKey, normalizedContentType);
        String publicUrl = r2StorageService.getPublicUrl(objectKey);

        Map<String, String> response = new HashMap<>();
        response.put("presignedUrl", presignedUrl);
        response.put("publicUrl", publicUrl);
        return response;
    }

    private CsQuestion createQuestion(CsStage stage, CsAdminQuestionDraft draft) {
        validateDraftByType(draft);
        CsQuestionContentMode contentMode = resolveContentMode(draft);
        CsQuestionGradingMode gradingMode = resolveGradingMode(draft);
        String contentBlocks = normalizeContentBlocks(contentMode, draft.contentBlocks());
        String metadata = normalizeOptionalText(draft.metadata());

        CsQuestion question = csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(draft.questionType())
                .prompt(draft.prompt().trim())
                .explanation(draft.explanation().trim())
                .contentMode(contentMode)
                .contentBlocks(contentBlocks)
                .gradingMode(gradingMode)
                .metadata(metadata)
                .isActive(true)
                .build());

        saveChildrenByType(question, draft);
        return question;
    }

    private void updateQuestion(CsQuestion question, CsAdminQuestionDraft draft) {
        validateDraftByType(draft);
        CsQuestionType previousType = question.getQuestionType();
        CsQuestionContentMode contentMode = resolveContentMode(draft);
        CsQuestionGradingMode gradingMode = resolveGradingMode(draft);
        String contentBlocks = normalizeContentBlocks(contentMode, draft.contentBlocks());
        String metadata = normalizeOptionalText(draft.metadata());

        question.updateContent(
                draft.questionType(),
                draft.prompt().trim(),
                draft.explanation().trim(),
                contentMode,
                contentBlocks,
                gradingMode,
                metadata);

        if (previousType != draft.questionType()) {
            csQuestionChoiceRepository.deleteByQuestionId(question.getId());
            csQuestionShortAnswerRepository.deleteByQuestionId(question.getId());
            saveChildrenByType(question, draft);
            return;
        }

        if (draft.questionType() == CsQuestionType.SHORT_ANSWER) {
            syncShortAnswers(question, validateShortAnswers(draft.shortAnswers(), gradingMode));
            return;
        }

        syncChoices(question, draft.choices());
    }

    private void saveChildrenByType(CsQuestion question, CsAdminQuestionDraft draft) {
        if (draft.questionType() == CsQuestionType.MULTIPLE_CHOICE || draft.questionType() == CsQuestionType.OX) {
            saveChoices(question, draft.choices());
            return;
        }
        saveShortAnswers(question, validateShortAnswers(draft.shortAnswers(), resolveGradingMode(draft)));
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
            short blankIndex = normalizeBlankIndex(answer.blankIndex());
            csQuestionShortAnswerRepository.save(CsQuestionShortAnswer.builder()
                    .question(question)
                    .answerText(answer.answerText().trim())
                    .normalizedAnswer(normalizeStrict(answer.answerText()))
                    .blankIndex(blankIndex)
                    .isPrimary(Boolean.TRUE.equals(answer.isPrimary()))
                    .build());
        }
    }

    private void syncShortAnswers(CsQuestion question, List<CsAdminQuestionShortAnswerDraft> shortAnswers) {
        List<CsAdminQuestionShortAnswerDraft> normalizedDrafts = normalizePrimaryShortAnswers(shortAnswers);
        List<CsQuestionShortAnswer> existingAnswers = csQuestionShortAnswerRepository
                .findByQuestion_IdOrderByBlankIndexAscIsPrimaryDescIdAsc(question.getId());

        Map<String, CsQuestionShortAnswer> existingByBlankAndNormalized = new HashMap<>();
        for (CsQuestionShortAnswer existingAnswer : existingAnswers) {
            existingByBlankAndNormalized.put(
                    toShortAnswerKey(existingAnswer.getBlankIndex(), existingAnswer.getNormalizedAnswer()),
                    existingAnswer);
        }

        for (CsAdminQuestionShortAnswerDraft answer : normalizedDrafts) {
            String normalized = normalizeStrict(answer.answerText());
            short blankIndex = normalizeBlankIndex(answer.blankIndex());
            String key = toShortAnswerKey(blankIndex, normalized);
            CsQuestionShortAnswer existing = existingByBlankAndNormalized.remove(key);
            if (existing == null) {
                csQuestionShortAnswerRepository.save(CsQuestionShortAnswer.builder()
                        .question(question)
                        .answerText(answer.answerText().trim())
                        .normalizedAnswer(normalized)
                        .blankIndex(blankIndex)
                        .isPrimary(Boolean.TRUE.equals(answer.isPrimary()))
                        .build());
                continue;
            }

            existing.update(
                    answer.answerText().trim(),
                    normalized,
                    blankIndex,
                    Boolean.TRUE.equals(answer.isPrimary()));
        }

        if (!existingByBlankAndNormalized.isEmpty()) {
            csQuestionShortAnswerRepository.deleteAllInBatch(existingByBlankAndNormalized.values());
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
        if (resolveContentMode(draft) == CsQuestionContentMode.BLOCKS
                && normalizeOptionalText(draft.contentBlocks()) == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "BLOCKS 모드에서는 contentBlocks가 필요합니다.");
        }

        if (draft.questionType() == CsQuestionType.MULTIPLE_CHOICE) {
            validateChoices(draft.choices(), false);
            return;
        }
        if (draft.questionType() == CsQuestionType.OX) {
            validateChoices(draft.choices(), true);
            return;
        }
        validateShortAnswers(draft.shortAnswers(), resolveGradingMode(draft));
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

    private List<CsAdminQuestionShortAnswerDraft> validateShortAnswers(
            List<CsAdminQuestionShortAnswerDraft> shortAnswers,
            CsQuestionGradingMode gradingMode) {
        if (shortAnswers == null || shortAnswers.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "단답형 문제는 shortAnswers가 1개 이상 필요합니다.");
        }

        Set<String> normalizedSet = new HashSet<>();
        Map<Short, Integer> answerCountByBlank = new HashMap<>();
        Map<Short, Integer> primaryCountByBlank = new HashMap<>();
        List<CsAdminQuestionShortAnswerDraft> normalized = new ArrayList<>(shortAnswers.size());
        for (CsAdminQuestionShortAnswerDraft answer : shortAnswers) {
            String trimmed = answer.answerText() == null ? "" : answer.answerText().trim();
            if (trimmed.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "shortAnswers.answerText는 비어 있을 수 없습니다.");
            }

            short blankIndex = normalizeBlankIndex(answer.blankIndex());
            String normalizedAnswer = normalizeStrict(trimmed);
            if (!normalizedSet.add(toShortAnswerKey(blankIndex, normalizedAnswer))) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "같은 빈칸의 단답형 정답은 중복될 수 없습니다.");
            }

            answerCountByBlank.merge(blankIndex, 1, Integer::sum);
            if (Boolean.TRUE.equals(answer.isPrimary())) {
                primaryCountByBlank.merge(blankIndex, 1, Integer::sum);
            }

            normalized.add(new CsAdminQuestionShortAnswerDraft(trimmed, (int) blankIndex, answer.isPrimary()));
        }

        for (Map.Entry<Short, Integer> primaryEntry : primaryCountByBlank.entrySet()) {
            if (primaryEntry.getValue() != null && primaryEntry.getValue() > 1) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        primaryEntry.getKey() + "번 빈칸에는 대표 정답을 1개만 설정할 수 있습니다.");
            }
        }

        if (isMultiBlankGradingMode(gradingMode)) {
            if (answerCountByBlank.size() < 2) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "멀티 빈칸 문제는 빈칸별 정답이 최소 2개 이상 필요합니다.");
            }
            short maxBlankIndex = answerCountByBlank.keySet().stream()
                    .max(Short::compareTo)
                    .orElse(DEFAULT_SHORT_ANSWER_BLANK_INDEX);
            for (short i = 1; i <= maxBlankIndex; i++) {
                if (!answerCountByBlank.containsKey(i)) {
                    throw new BusinessException(
                            ErrorCode.INVALID_INPUT_VALUE,
                            "빈칸 번호는 1부터 순서대로 입력해야 합니다. 누락된 번호: " + i);
                }
            }
        } else if (answerCountByBlank.keySet().stream().anyMatch(index -> index != DEFAULT_SHORT_ANSWER_BLANK_INDEX)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "단일 단답 모드에서는 blankIndex를 1로만 설정할 수 있습니다.");
        }

        return normalized;
    }

    private void validateImportRequest(
            CsStage stage,
            ImportMode mode,
            List<CsAdminQuestionDraft> questions,
            List<CsQuestion> activeQuestions) {
        if (questions == null || questions.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "questions는 최소 1개 이상 필요합니다.");
        }

        boolean isPastExamStage = stage.getTrack().getLearningMode() == CsTrackLearningMode.PAST_EXAM;

        if (mode == ImportMode.REPLACE) {
            if (isPastExamStage) {
                if (questions.size() > PAST_EXAM_MAX_STAGE_QUESTION_COUNT) {
                    throw new BusinessException(
                            ErrorCode.INVALID_INPUT_VALUE,
                            "기출 회차 문제는 최대 " + PAST_EXAM_MAX_STAGE_QUESTION_COUNT + "개까지 등록할 수 있습니다.");
                }
            } else if (questions.size() != CURRICULUM_REQUIRED_STAGE_QUESTION_COUNT) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        "전체 교체(REPLACE)는 문제가 정확히 "
                                + CURRICULUM_REQUIRED_STAGE_QUESTION_COUNT
                                + "개여야 합니다.");
            }
        }

        if (isPastExamStage && mode == ImportMode.UPSERT) {
            Set<Long> activeQuestionIds = activeQuestions.stream()
                    .map(CsQuestion::getId)
                    .collect(java.util.stream.Collectors.toSet());

            long newQuestionCount = questions.stream()
                    .filter(draft -> draft.questionId() == null || !activeQuestionIds.contains(draft.questionId()))
                    .count();

            long projectedTotal = activeQuestionIds.size() + newQuestionCount;
            if (projectedTotal > PAST_EXAM_MAX_STAGE_QUESTION_COUNT) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        "기출 회차 문제는 최대 " + PAST_EXAM_MAX_STAGE_QUESTION_COUNT + "개까지 등록할 수 있습니다.");
            }
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
        Map<Short, Integer> firstIndexByBlank = new HashMap<>();
        Set<Short> hasPrimaryByBlank = new HashSet<>();

        for (int i = 0; i < shortAnswers.size(); i++) {
            CsAdminQuestionShortAnswerDraft answer = shortAnswers.get(i);
            short blankIndex = normalizeBlankIndex(answer.blankIndex());
            boolean isPrimary = Boolean.TRUE.equals(answer.isPrimary());
            if (isPrimary) {
                hasPrimaryByBlank.add(blankIndex);
            }
            firstIndexByBlank.putIfAbsent(blankIndex, i);

            normalizedDrafts.add(new CsAdminQuestionShortAnswerDraft(
                    answer.answerText().trim(),
                    (int) blankIndex,
                    isPrimary));
        }

        for (Map.Entry<Short, Integer> entry : firstIndexByBlank.entrySet()) {
            if (hasPrimaryByBlank.contains(entry.getKey())) {
                continue;
            }
            int index = entry.getValue();
            CsAdminQuestionShortAnswerDraft answer = normalizedDrafts.get(index);
            normalizedDrafts.set(index, new CsAdminQuestionShortAnswerDraft(
                    answer.answerText(),
                    answer.blankIndex(),
                    true));
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
                .findByQuestion_IdOrderByBlankIndexAscIsPrimaryDescIdAsc(question.getId())
                .stream()
                .map(answer -> new CsAdminQuestionShortAnswerResponse(
                        answer.getId(),
                        answer.getAnswerText(),
                        answer.getNormalizedAnswer(),
                        answer.getBlankIndex() == null ? (int) DEFAULT_SHORT_ANSWER_BLANK_INDEX : (int) answer.getBlankIndex(),
                        answer.getIsPrimary()))
                .toList();

        return new CsAdminQuestionResponse(
                question.getId(),
                question.getQuestionType(),
                question.getPrompt(),
                question.getExplanation(),
                question.getContentMode(),
                question.getContentBlocks(),
                question.getGradingMode(),
                question.getMetadata(),
                question.getIsActive(),
                choices,
                shortAnswers);
    }

    private CsQuestionContentMode resolveContentMode(CsAdminQuestionDraft draft) {
        if (draft.contentMode() != null) {
            return draft.contentMode();
        }
        return CsQuestionContentMode.LEGACY_TEXT;
    }

    private CsQuestionGradingMode resolveGradingMode(CsAdminQuestionDraft draft) {
        if (draft.gradingMode() != null) {
            return draft.gradingMode();
        }

        return switch (draft.questionType()) {
            case MULTIPLE_CHOICE, OX -> CsQuestionGradingMode.SINGLE_CHOICE;
            case SHORT_ANSWER -> CsQuestionGradingMode.SHORT_TEXT_EXACT;
        };
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

    private boolean isMultiBlankGradingMode(CsQuestionGradingMode gradingMode) {
        return gradingMode == CsQuestionGradingMode.MULTI_BLANK_ORDERED
                || gradingMode == CsQuestionGradingMode.MULTI_BLANK_UNORDERED
                || gradingMode == CsQuestionGradingMode.ORDERING;
    }

    private short normalizeBlankIndex(Integer blankIndex) {
        if (blankIndex == null || blankIndex < 1) {
            return DEFAULT_SHORT_ANSWER_BLANK_INDEX;
        }
        if (blankIndex > Short.MAX_VALUE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "blankIndex 값이 너무 큽니다.");
        }
        return blankIndex.shortValue();
    }

    private String toShortAnswerKey(Short blankIndex, String normalizedAnswer) {
        short safeBlankIndex = blankIndex == null ? DEFAULT_SHORT_ANSWER_BLANK_INDEX : blankIndex;
        return safeBlankIndex + ":" + normalizedAnswer;
    }

    private String normalizeContentBlocks(CsQuestionContentMode contentMode, String contentBlocks) {
        String normalized = normalizeOptionalText(contentBlocks);
        if (contentMode == CsQuestionContentMode.LEGACY_TEXT) {
            return null;
        }
        return normalized;
    }

    private String normalizeOptionalText(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
        List<CsAdminStageSummaryResponse> stages = csStageRepository.findByTrack_IdOrderByStageNoAsc(track.getId())
                .stream()
                .map(stage -> new CsAdminStageSummaryResponse(stage.getId(), (int) stage.getStageNo()))
                .toList();

        return new CsAdminTrackResponse(
                track.getId(),
                track.getDomain().getId(),
                track.getDomain().getName(),
                (int) track.getTrackNo(),
                track.getName(),
                track.getLearningMode(),
                track.getExamYear() == null ? null : (int) track.getExamYear(),
                stages);
    }

    private int resolveRequestedStageCount(
            CsTrackLearningMode learningMode,
            Short examYear,
            Integer requestedStageCount) {
        if (learningMode == CsTrackLearningMode.PAST_EXAM && requestedStageCount == null) {
            return expectedPastExamRoundCount(examYear);
        }
        if (requestedStageCount == null) {
            return DEFAULT_STAGE_COUNT_PER_TRACK;
        }
        if (requestedStageCount < 1 || requestedStageCount > MAX_STAGE_COUNT_PER_TRACK) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    "stageCount는 1 이상 " + MAX_STAGE_COUNT_PER_TRACK + " 이하여야 합니다.");
        }
        if (learningMode == CsTrackLearningMode.PAST_EXAM && examYear != null) {
            int expected = expectedPastExamRoundCount(examYear);
            if (requestedStageCount != expected) {
                throw new BusinessException(
                        ErrorCode.INVALID_INPUT_VALUE,
                        "기출 트랙의 stageCount는 " + examYear + "년 기준 " + expected + "회차여야 합니다.");
            }
        }
        return requestedStageCount;
    }

    private CsTrackLearningMode resolveLearningMode(CsTrackLearningMode learningMode) {
        if (learningMode == null) {
            return CsTrackLearningMode.CURRICULUM;
        }
        return learningMode;
    }

    private Short resolveExamYear(CsTrackLearningMode learningMode, Integer examYear) {
        if (learningMode == CsTrackLearningMode.CURRICULUM) {
            return null;
        }
        if (examYear == null) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    "기출 트랙은 examYear가 필요합니다.");
        }
        if (examYear < PAST_EXAM_MIN_YEAR || examYear > PAST_EXAM_MAX_YEAR) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    "examYear는 " + PAST_EXAM_MIN_YEAR + "년부터 " + PAST_EXAM_MAX_YEAR + "년까지 가능합니다.");
        }
        return examYear.shortValue();
    }

    private int expectedPastExamRoundCount(Short examYear) {
        if (examYear == null) {
            return 3;
        }
        return examYear == 2020 ? 4 : 3;
    }

    private void validatePastExamTrackUniqueness(
            Integer domainId,
            CsTrackLearningMode learningMode,
            Short examYear,
            Long selfTrackId) {
        if (learningMode != CsTrackLearningMode.PAST_EXAM || examYear == null) {
            return;
        }

        List<CsDomainTrack> tracks = csDomainTrackRepository.findByDomain_IdOrderByTrackNoAsc(domainId);
        boolean duplicated = tracks.stream()
                .filter(track -> selfTrackId == null || !track.getId().equals(selfTrackId))
                .anyMatch(track -> track.getLearningMode() == CsTrackLearningMode.PAST_EXAM
                        && examYear.equals(track.getExamYear()));

        if (duplicated) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    domainId + "번 도메인에 " + examYear + "년 기출 트랙이 이미 존재합니다.");
        }
    }

    private void resequenceTracks(List<CsDomainTrack> tracks) {
        for (int i = 0; i < tracks.size(); i++) {
            short expectedTrackNo = (short) (i + 1);
            CsDomainTrack current = tracks.get(i);
            if (current.getTrackNo() != expectedTrackNo) {
                current.updateTrackNo(expectedTrackNo);
            }
        }
    }

    private void resequenceStages(List<CsStage> stages) {
        for (int i = 0; i < stages.size(); i++) {
            short expectedStageNo = (short) (i + 1);
            CsStage current = stages.get(i);
            if (current.getStageNo() != expectedStageNo) {
                current.updateStageNo(expectedStageNo);
            }
        }
    }

    private Map<Short, Short> resolveMaxStageNoByTrackNo(List<CsDomainTrack> tracks) {
        Map<Short, Short> maxStageNoByTrackNo = new HashMap<>();
        for (CsDomainTrack current : tracks) {
            short maxStageNo = csStageRepository.findTopByTrack_IdOrderByStageNoDesc(current.getId())
                    .map(CsStage::getStageNo)
                    .orElse((short) 1);
            maxStageNoByTrackNo.put(current.getTrackNo(), maxStageNo);
        }
        return maxStageNoByTrackNo;
    }

    private short resolveTrackNoAfterDeletion(short currentTrackNo, short deletedTrackNo, short maxTrackNo) {
        if (currentTrackNo > deletedTrackNo) {
            return clampTrackNo((short) (currentTrackNo - 1), maxTrackNo);
        }
        if (currentTrackNo == deletedTrackNo) {
            return clampTrackNo((short) Math.min(deletedTrackNo, maxTrackNo), maxTrackNo);
        }
        return clampTrackNo(currentTrackNo, maxTrackNo);
    }

    private short resolveStageNoAfterDeletion(short currentStageNo, short deletedStageNo, short maxStageNo) {
        if (currentStageNo > deletedStageNo) {
            return clampStageNo((short) (currentStageNo - 1), maxStageNo);
        }
        if (currentStageNo == deletedStageNo) {
            return clampStageNo(currentStageNo, maxStageNo);
        }
        return clampStageNo(currentStageNo, maxStageNo);
    }

    private short clampTrackNo(short trackNo, short maxTrackNo) {
        if (trackNo < 1) {
            return 1;
        }
        if (trackNo > maxTrackNo) {
            return maxTrackNo;
        }
        return trackNo;
    }

    private short clampStageNo(short stageNo, short maxStageNo) {
        if (stageNo < 1) {
            return 1;
        }
        if (stageNo > maxStageNo) {
            return maxStageNo;
        }
        return stageNo;
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

    private String sanitizeFileName(String fileName) {
        if (fileName == null) {
            return "";
        }
        String normalized = fileName.trim().replace("\\", "/");
        int slashIndex = normalized.lastIndexOf('/');
        if (slashIndex >= 0 && slashIndex < normalized.length() - 1) {
            normalized = normalized.substring(slashIndex + 1);
        }
        return normalized.replaceAll("[^a-zA-Z0-9._-]", "_");
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
