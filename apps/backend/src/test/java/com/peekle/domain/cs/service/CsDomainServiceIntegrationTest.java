package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.dto.response.CsCurrentDomainChangeResponse;
import com.peekle.domain.cs.dto.response.CsDomainSubmitResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsUserProfile;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsUserProfileRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

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
        CsDomain domain = csDomainRepository.save(CsDomain.builder()
                .id(domainId)
                .name(domainName)
                .build());

        csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo((short) 1)
                .name(trackName)
                .build());
        return domain;
    }
}
