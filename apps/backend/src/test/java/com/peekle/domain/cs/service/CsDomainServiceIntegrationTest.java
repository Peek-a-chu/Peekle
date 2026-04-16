package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.dto.response.CsStageStatusResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsUserDomainProgress;
import com.peekle.domain.cs.entity.CsUserProfile;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsUserProfileRepository;
import com.peekle.domain.cs.enums.CsStageStatus;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CsDomainServiceIntegrationTest {

    @Autowired
    private CsDomainService csDomainService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CsDomainRepository csDomainRepository;

    @Autowired
    private CsDomainTrackRepository csDomainTrackRepository;

    @Autowired
    private CsStageRepository csStageRepository;

    @Autowired
    private CsUserDomainProgressRepository csUserDomainProgressRepository;

    @Autowired
    private CsUserProfileRepository csUserProfileRepository;

    @Test
    @DisplayName("CS 탭 최초 진입 시 도메인 선택 상태를 반환한다")
    void bootstrap_firstEntry_requiresDomainSelection() {
        User user = createUser("first-entry");

        CsBootstrapResponse response = csDomainService.getBootstrap(user.getId());

        assertThat(response.needsDomainSelection()).isTrue();
        assertThat(response.currentDomain()).isNull();
        assertThat(response.progress()).isNull();
    }

    @Test
    @DisplayName("도메인 선택 후 저장되고 재진입 시 마지막 선택 도메인이 기본 적용된다")
    void selectDomain_persistAndApplyOnReentry() {
        User user = createUser("re-entry");
        CsDomain domain1 = createDomainWithTrack(1, "요구사항·분석·화면설계", "요구사항 확인");
        CsDomain domain2 = createDomainWithTrack(2, "데이터 입출력·SQL 기초", "데이터 입출력·SQL");

        csDomainService.addMyDomain(user.getId(), domain1.getId());
        csDomainService.addMyDomain(user.getId(), domain2.getId());

        CsCurrentDomainChangeResponse changed = csDomainService.changeCurrentDomain(user.getId(), domain2.getId());
        assertThat(changed.currentDomain().id()).isEqualTo(domain2.getId());

        CsBootstrapResponse response = csDomainService.getBootstrap(user.getId());

        assertThat(response.needsDomainSelection()).isFalse();
        assertThat(response.currentDomain()).isNotNull();
        assertThat(response.currentDomain().id()).isEqualTo(domain2.getId());
        assertThat(response.progress()).isNotNull();
        assertThat(response.progress().currentTrackNo()).isEqualTo(1);
        assertThat(response.progress().currentStageNo()).isEqualTo(1);
    }

    @Test
    @DisplayName("도메인 미선택 상태에서는 학습 맵 진입용 데이터가 내려오지 않는다")
    void bootstrap_withoutSelectedDomain_blocksLearningMapEntry() {
        User user = createUser("blocked-map");
        csUserProfileRepository.save(CsUserProfile.builder()
                .user(user)
                .build());

        CsBootstrapResponse response = csDomainService.getBootstrap(user.getId());

        assertThat(response.needsDomainSelection()).isTrue();
        assertThat(response.currentDomain()).isNull();
        assertThat(response.progress()).isNull();
    }

    @Test
    @DisplayName("현재 트랙 학습 중이면 다음 트랙 1번 스테이지가 미리 노출된다")
    void bootstrap_showsPreviewOfNextTrackFirstStage() {
        User user = createUser("preview-next-track");
        CsDomain domain = createDomain(101, "트랙 프리뷰 도메인");
        CsDomainTrack track1 = createTrack(domain, 1, "1트랙");
        CsDomainTrack track2 = createTrack(domain, 2, "2트랙");
        createStages(track1, 5);
        List<CsStage> track2Stages = createStages(track2, 5);

        csDomainService.addMyDomain(user.getId(), domain.getId());

        CsBootstrapResponse response = csDomainService.getBootstrap(user.getId());
        assertThat(response.stages()).hasSize(6);

        CsStageStatusResponse preview = response.stages().get(5);
        assertThat(preview.trackNo()).isEqualTo(2);
        assertThat(preview.stageNo()).isEqualTo(1);
        assertThat(preview.stageId()).isEqualTo(track2Stages.get(0).getId());
        assertThat(preview.status()).isEqualTo(CsStageStatus.LOCKED);
    }

    @Test
    @DisplayName("2번 트랙 학습 중이어도 1번 트랙 스테이지가 상단에 유지된다")
    void bootstrap_whenStudyingTrack2_keepsTrack1StagesVisible() {
        User user = createUser("track2-with-track1-visible");
        CsDomain domain = createDomain(102, "트랙 가시성 도메인");
        CsDomainTrack track1 = createTrack(domain, 1, "1트랙");
        CsDomainTrack track2 = createTrack(domain, 2, "2트랙");
        CsDomainTrack track3 = createTrack(domain, 3, "3트랙");
        createStages(track1, 5);
        createStages(track2, 5);
        createStages(track3, 5);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        CsUserDomainProgress progress = csUserDomainProgressRepository
                .findByUser_IdAndDomain_Id(user.getId(), domain.getId())
                .orElseThrow();
        progress.advanceTo((short) 2, (short) 1);

        CsBootstrapResponse response = csDomainService.getBootstrap(user.getId());
        assertThat(response.progress()).isNotNull();
        assertThat(response.progress().currentTrackNo()).isEqualTo(2);
        assertThat(response.stages()).isNotEmpty();

        List<CsStageStatusResponse> track1Stages = response.stages().stream()
                .filter(stage -> stage.trackNo() == 1)
                .toList();
        assertThat(track1Stages).hasSize(5);
        assertThat(track1Stages).allSatisfy(stage -> assertThat(stage.status()).isEqualTo(CsStageStatus.COMPLETED));

        assertThat(response.stages().stream()
                .anyMatch(stage -> stage.trackNo() == 3 && stage.stageNo() == 1))
                .isTrue();
    }

    @Test
    @DisplayName("도메인 선택 목록에서 정보처리기사 기출(id=10)은 제외된다")
    void getAvailableDomains_excludesPastExamDomain() {
        User user = createUser("exclude-past-exam-domain");
        createDomainWithTrack(10, "정보처리기사 기출", "2025 기출");
        createDomainWithTrack(201, "일반 CS 도메인", "자료구조");

        assertThat(csDomainService.getAvailableDomains(user.getId()))
                .extracting(domain -> domain.id())
                .doesNotContain(10);
    }

    @Test
    @DisplayName("정보처리기사 기출(id=10)은 도메인으로 추가할 수 없다")
    void addMyDomain_pastExamDomain_throwsInvalidInput() {
        User user = createUser("add-past-exam-domain-denied");
        createDomainWithTrack(10, "정보처리기사 기출", "2025 기출");

        assertThatThrownBy(() -> csDomainService.addMyDomain(user.getId(), 10))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> {
                    BusinessException businessException = (BusinessException) exception;
                    assertThat(businessException.getErrorCode()).isEqualTo(ErrorCode.INVALID_INPUT_VALUE);
                });
    }

    private User createUser(String suffix) {
        return userRepository.save(User.builder()
                .socialId("social-" + suffix)
                .provider("TEST")
                .nickname("nick-" + suffix)
                .bojId("boj-" + suffix)
                .profileImg("default.png")
                .profileImgThumb("default-thumb.png")
                .build());
    }

    private CsDomain createDomainWithTrack(int domainId, String domainName, String trackName) {
        CsDomain domain = createDomain(domainId, domainName);
        createTrack(domain, 1, trackName);
        return domain;
    }

    private CsDomain createDomain(int domainId, String domainName) {
        return csDomainRepository.save(CsDomain.builder()
                .id(domainId)
                .name(domainName)
                .build());
    }

    private CsDomainTrack createTrack(CsDomain domain, int trackNo, String trackName) {
        return csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo((short) trackNo)
                .name(trackName)
                .build());
    }

    private List<CsStage> createStages(CsDomainTrack track, int stageCount) {
        java.util.ArrayList<CsStage> stages = new java.util.ArrayList<>();
        for (int stageNo = 1; stageNo <= stageCount; stageNo++) {
            stages.add(csStageRepository.save(CsStage.builder()
                    .track(track)
                    .stageNo((short) stageNo)
                    .build()));
        }
        return stages;
    }
}
