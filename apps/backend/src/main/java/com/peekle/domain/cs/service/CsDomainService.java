package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.dto.response.CsMyDomainItemResponse;
import com.peekle.domain.cs.dto.response.CsProgressResponse;
import com.peekle.domain.cs.dto.response.CsQuestionChoiceResponse;
import com.peekle.domain.cs.dto.response.CsQuestionPayloadResponse;
import com.peekle.domain.cs.dto.response.CsStageStatusResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.entity.CsUserProfile;
import com.peekle.domain.cs.enums.CsStageStatus;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsUserProfileRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsDomainService {

    private static final short INITIAL_TRACK_NO = 1;
    private static final short INITIAL_STAGE_NO = 1;
    private static final String LOCK_REASON_PREVIOUS_STAGE = "이전 스테이지를 먼저 완료해야 합니다.";
    private static final String LOCK_REASON_NOT_CURRENT_TRACK = "현재 학습 중인 트랙만 입장할 수 있습니다.";

    private final CsDomainRepository csDomainRepository;
    private final CsDomainTrackRepository csDomainTrackRepository;
    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsQuestionChoiceRepository csQuestionChoiceRepository;
    private final CsUserProfileRepository csUserProfileRepository;
    private final CsUserDomainProgressRepository csUserDomainProgressRepository;
    private final UserRepository userRepository;

    public CsBootstrapResponse getBootstrap(Long userId) {
        User user = getUser(userId);

        List<CsUserDomainProgress> progresses = csUserDomainProgressRepository
                .findByUser_IdOrderByUpdatedAtDesc(user.getId());

        CsDomain currentDomain = csUserProfileRepository.findByUserIdWithCurrentDomain(user.getId())
                .map(CsUserProfile::getCurrentDomain)
                .orElse(null);

        if (currentDomain == null && !progresses.isEmpty()) {
            currentDomain = progresses.get(0).getDomain();
        }

        if (currentDomain == null) {
            return new CsBootstrapResponse(true, null, null, List.of());
        }

        Integer currentDomainId = currentDomain.getId();
        CsUserDomainProgress currentProgress = progresses.stream()
                .filter(progress -> progress.getDomain().getId().equals(currentDomainId))
                .findFirst()
                .orElse(null);

        CsProgressResponse progressResponse = currentProgress != null ? toProgressResponse(currentProgress) : null;
        List<CsStageStatusResponse> stages = currentProgress != null
                ? toStageStatusResponses(currentProgress)
                : List.of();

        return new CsBootstrapResponse(
                false,
                toDomainResponse(currentDomain),
                progressResponse,
                stages);
    }

    public List<CsDomainResponse> getAvailableDomains(Long userId) {
        getUser(userId);

        Set<Integer> studyingDomainIds = csUserDomainProgressRepository.findByUser_Id(userId)
                .stream()
                .map(progress -> progress.getDomain().getId())
                .collect(Collectors.toSet());

        return csDomainRepository.findAllByOrderByIdAsc()
                .stream()
                .filter(domain -> !studyingDomainIds.contains(domain.getId()))
                .map(this::toDomainResponse)
                .toList();
    }

    public List<CsMyDomainItemResponse> getMyDomains(Long userId) {
        getUser(userId);

        Integer currentDomainId = csUserProfileRepository.findByUserIdWithCurrentDomain(userId)
                .map(CsUserProfile::getCurrentDomain)
                .map(CsDomain::getId)
                .orElse(null);

        return csUserDomainProgressRepository.findByUser_IdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(progress -> new CsMyDomainItemResponse(
                        toDomainResponse(progress.getDomain()),
                        toProgressResponse(progress),
                        currentDomainId != null && currentDomainId.equals(progress.getDomain().getId())))
                .toList();
    }

    @Transactional
    public CsDomainSubmitResponse addMyDomain(Long userId, Integer domainId) {
        User user = getUser(userId);
        CsDomain domain = getDomain(domainId);

        boolean added = false;
        CsUserDomainProgress progress = csUserDomainProgressRepository
                .findByUser_IdAndDomain_Id(userId, domainId)
                .orElse(null);

        if (progress == null) {
            progress = csUserDomainProgressRepository.save(CsUserDomainProgress.builder()
                    .user(user)
                    .domain(domain)
                    .currentTrackNo(INITIAL_TRACK_NO)
                    .currentStageNo(INITIAL_STAGE_NO)
                    .build());
            added = true;
        }

        CsUserProfile profile = getOrCreateUserProfile(userId, user);

        if (profile.getCurrentDomain() == null) {
            profile.updateCurrentDomain(domain);
        }

        boolean isCurrent = profile.getCurrentDomain() != null
                && profile.getCurrentDomain().getId().equals(domainId);

        return new CsDomainSubmitResponse(
                added,
                toDomainResponse(domain),
                toProgressResponse(progress),
                isCurrent);
    }

    @Transactional
    public CsCurrentDomainChangeResponse changeCurrentDomain(Long userId, Integer domainId) {
        User user = getUser(userId);
        CsDomain domain = getDomain(domainId);

        CsUserDomainProgress progress = csUserDomainProgressRepository
                .findByUser_IdAndDomain_Id(userId, domainId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_STUDYING));

        CsUserProfile profile = getOrCreateUserProfile(userId, user);

        profile.updateCurrentDomain(domain);

        return new CsCurrentDomainChangeResponse(
                toDomainResponse(domain),
                toProgressResponse(progress));
    }

    public CsAttemptStartResponse startStageAttempt(Long userId, Long stageId) {
        User user = getUser(userId);
        CsStage stage = csStageRepository.findByIdWithTrackAndDomain(stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_STAGE_NOT_FOUND));

        Integer domainId = stage.getTrack().getDomain().getId();
        if (stage.getTrack().getLearningMode() == CsTrackLearningMode.CURRICULUM) {
            CsUserDomainProgress progress = csUserDomainProgressRepository
                    .findByUser_IdAndDomain_Id(user.getId(), domainId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_STUDYING));

            validateStageAccess(progress, stage);
        }

        List<CsQuestion> questions = csQuestionRepository.findByStage_IdAndIsActiveTrueOrderByIdAsc(stageId);
        if (questions.isEmpty()) {
            throw new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND, "스테이지에 등록된 문제가 없습니다.");
        }

        return new CsAttemptStartResponse(stage.getId(), questions.size(), toQuestionPayload(questions.get(0)));
    }

    private CsUserProfile getOrCreateUserProfile(Long userId, User user) {
        return csUserProfileRepository.findById(userId)
                .orElseGet(() -> csUserProfileRepository.save(CsUserProfile.builder()
                        .user(user)
                        .build()));
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private CsDomain getDomain(Integer domainId) {
        return csDomainRepository.findById(domainId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_DOMAIN_NOT_FOUND));
    }

    private CsDomainResponse toDomainResponse(CsDomain domain) {
        return new CsDomainResponse(domain.getId(), domain.getName());
    }

    private CsProgressResponse toProgressResponse(CsUserDomainProgress progress) {
        String trackName = csDomainTrackRepository
                .findByDomain_IdAndTrackNo(progress.getDomain().getId(), progress.getCurrentTrackNo())
                .map(track -> track.getName())
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_TRACK_NOT_FOUND));

        return new CsProgressResponse(
                (int) progress.getCurrentTrackNo(),
                trackName,
                (int) progress.getCurrentStageNo());
    }

    private List<CsStageStatusResponse> toStageStatusResponses(CsUserDomainProgress progress) {
        CsDomainTrack track = csDomainTrackRepository
                .findByDomain_IdAndTrackNo(progress.getDomain().getId(), progress.getCurrentTrackNo())
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_TRACK_NOT_FOUND));

        List<CsStage> stages = csStageRepository.findByTrack_IdOrderByStageNoAsc(track.getId());
        List<CsStageStatusResponse> responses = new ArrayList<>(stages.size());
        short currentStageNo = progress.getCurrentStageNo();

        for (CsStage stage : stages) {
            short stageNo = stage.getStageNo();
            if (stageNo < currentStageNo) {
                responses.add(new CsStageStatusResponse(
                        stage.getId(),
                        (int) stageNo,
                        CsStageStatus.COMPLETED,
                        null));
            } else if (stageNo == currentStageNo) {
                responses.add(new CsStageStatusResponse(
                        stage.getId(),
                        (int) stageNo,
                        CsStageStatus.IN_PROGRESS,
                        null));
            } else {
                responses.add(new CsStageStatusResponse(
                        stage.getId(),
                        (int) stageNo,
                        CsStageStatus.LOCKED,
                        LOCK_REASON_PREVIOUS_STAGE));
            }
        }
        return responses;
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
}
