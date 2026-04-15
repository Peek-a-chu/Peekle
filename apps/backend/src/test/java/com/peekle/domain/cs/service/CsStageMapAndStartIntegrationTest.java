package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsBootstrapResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsStageStatus;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CsStageMapAndStartIntegrationTest {

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
    private CsQuestionRepository csQuestionRepository;

    @Autowired
    private CsQuestionChoiceRepository csQuestionChoiceRepository;

    @Autowired
    private CsUserDomainProgressRepository csUserDomainProgressRepository;

    @Test
    @DisplayName("bootstrap 응답에 완료/진행/잠금 스테이지 상태가 포함된다")
    void bootstrap_includesStageStatuses() {
        User user = createUser("stage-map");
        CsDomain domain = createDomain(301, "테스트 도메인");
        CsDomainTrack track = createTrack(domain, 1, "테스트 트랙");
        CsStage stage1 = createStage(track, 1);
        CsStage stage2 = createStage(track, 2);
        CsStage stage3 = createStage(track, 3);
        createMultipleChoiceQuestion(stage1);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        CsBootstrapResponse bootstrap = csDomainService.getBootstrap(user.getId());

        assertThat(bootstrap.stages()).hasSize(3);
        assertThat(bootstrap.stages().get(0).stageId()).isEqualTo(stage1.getId());
        assertThat(bootstrap.stages().get(0).status()).isEqualTo(CsStageStatus.IN_PROGRESS);
        assertThat(bootstrap.stages().get(1).stageId()).isEqualTo(stage2.getId());
        assertThat(bootstrap.stages().get(1).status()).isEqualTo(CsStageStatus.LOCKED);
        assertThat(bootstrap.stages().get(1).lockReason()).isEqualTo("이전 스테이지를 먼저 완료해야 합니다.");
        assertThat(bootstrap.stages().get(2).stageId()).isEqualTo(stage3.getId());
        assertThat(bootstrap.stages().get(2).status()).isEqualTo(CsStageStatus.LOCKED);
    }

    @Test
    @DisplayName("잠금 스테이지 시작 시 CS_010과 안내 메시지를 반환한다")
    void startAttempt_lockedStage_throwsForbidden() {
        User user = createUser("locked-stage");
        CsDomain domain = createDomain(302, "잠금 테스트 도메인");
        CsDomainTrack track = createTrack(domain, 1, "잠금 테스트 트랙");
        createStage(track, 1);
        CsStage lockedStage = createStage(track, 2);
        createMultipleChoiceQuestion(lockedStage);

        csDomainService.addMyDomain(user.getId(), domain.getId());

        assertThatThrownBy(() -> csDomainService.startStageAttempt(user.getId(), lockedStage.getId()))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> {
                    BusinessException businessException = (BusinessException) exception;
                    assertThat(businessException.getErrorCode()).isEqualTo(ErrorCode.CS_FORBIDDEN_STAGE_ACCESS);
                    assertThat(businessException.getMessage()).isEqualTo("이전 스테이지를 먼저 완료해야 합니다.");
                });
    }

    @Test
    @DisplayName("해금된 스테이지 시작 시 첫 문제를 반환한다")
    void startAttempt_unlockedStage_returnsFirstQuestion() {
        User user = createUser("unlocked-stage");
        CsDomain domain = createDomain(303, "진입 테스트 도메인");
        CsDomainTrack track = createTrack(domain, 1, "진입 테스트 트랙");
        CsStage stage1 = createStage(track, 1);
        CsQuestion question = createMultipleChoiceQuestion(stage1);

        csDomainService.addMyDomain(user.getId(), domain.getId());

        CsAttemptStartResponse response = csDomainService.startStageAttempt(user.getId(), stage1.getId());

        assertThat(response.stageId()).isEqualTo(stage1.getId());
        assertThat(response.firstQuestion().questionId()).isEqualTo(question.getId());
        assertThat(response.firstQuestion().questionType()).isEqualTo(CsQuestionType.MULTIPLE_CHOICE);
        assertThat(response.firstQuestion().choices()).hasSize(4);
    }

    @Test
    @DisplayName("현재 2트랙 학습 중이어도 과거 1트랙 스테이지는 다시 진입할 수 있다")
    void startAttempt_pastTrackStage_isAllowed() {
        User user = createUser("past-track-access");
        CsDomain domain = createDomain(304, "과거 트랙 재진입 도메인");
        CsDomainTrack track1 = createTrack(domain, 1, "1트랙");
        CsDomainTrack track2 = createTrack(domain, 2, "2트랙");

        CsStage track1Stage1 = createStage(track1, 1);
        createMultipleChoiceQuestion(track1Stage1);
        CsStage track1Stage2 = createStage(track1, 2);
        CsQuestion question = createMultipleChoiceQuestion(track1Stage2);

        CsStage track2Stage1 = createStage(track2, 1);
        createMultipleChoiceQuestion(track2Stage1);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        csUserDomainProgressRepository.findByUser_IdAndDomain_Id(user.getId(), domain.getId())
                .orElseThrow()
                .advanceTo((short) 2, (short) 1);

        CsAttemptStartResponse response = csDomainService.startStageAttempt(user.getId(), track1Stage2.getId());

        assertThat(response.stageId()).isEqualTo(track1Stage2.getId());
        assertThat(response.firstQuestion().questionId()).isEqualTo(question.getId());
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

    private CsDomain createDomain(int domainId, String name) {
        return csDomainRepository.save(CsDomain.builder()
                .id(domainId)
                .name(name)
                .build());
    }

    private CsDomainTrack createTrack(CsDomain domain, int trackNo, String name) {
        return csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo((short) trackNo)
                .name(name)
                .build());
    }

    private CsStage createStage(CsDomainTrack track, int stageNo) {
        return csStageRepository.save(CsStage.builder()
                .track(track)
                .stageNo((short) stageNo)
                .build());
    }

    private CsQuestion createMultipleChoiceQuestion(CsStage stage) {
        CsQuestion question = csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(CsQuestionType.MULTIPLE_CHOICE)
                .prompt("테스트 문제")
                .explanation("테스트 해설")
                .isActive(true)
                .build());

        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 1)
                .content("선지 1")
                .isAnswer(true)
                .build());
        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 2)
                .content("선지 2")
                .isAnswer(false)
                .build());
        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 3)
                .content("선지 3")
                .isAnswer(false)
                .build());
        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 4)
                .content("선지 4")
                .isAnswer(false)
                .build());

        return question;
    }
}
