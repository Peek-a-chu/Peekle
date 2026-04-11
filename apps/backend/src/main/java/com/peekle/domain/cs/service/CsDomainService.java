package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.dto.response.CsMyDomainItemResponse;
import com.peekle.domain.cs.dto.response.CsProgressResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.entity.CsUserProfile;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsUserProfileRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsDomainService {

    private static final short INITIAL_TRACK_NO = 1;
    private static final short INITIAL_STAGE_NO = 1;

    private final CsDomainRepository csDomainRepository;
    private final CsDomainTrackRepository csDomainTrackRepository;
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
            return new CsBootstrapResponse(true, null, null);
        }

        Integer currentDomainId = currentDomain.getId();
        CsUserDomainProgress currentProgress = progresses.stream()
                .filter(progress -> progress.getDomain().getId().equals(currentDomainId))
                .findFirst()
                .orElse(null);

        return new CsBootstrapResponse(
                false,
                toDomainResponse(currentDomain),
                currentProgress != null ? toProgressResponse(currentProgress) : null);
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
}
