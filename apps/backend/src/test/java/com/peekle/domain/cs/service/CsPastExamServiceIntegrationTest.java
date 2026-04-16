package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsPastExamCatalogResponse;
import com.peekle.domain.cs.dto.response.CsPastExamRoundResponse;
import com.peekle.domain.cs.dto.response.CsPastExamYearResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsStageSolveRecord;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsStageSolveRecordRepository;
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
class CsPastExamServiceIntegrationTest {

    @Autowired
    private CsPastExamService csPastExamService;

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
    private CsStageSolveRecordRepository csStageSolveRecordRepository;

    @Test
    @DisplayName("기출 카탈로그는 2020~2025 연도와 회차 기본 구조를 반환한다")
    void catalog_returnsFixedYearsAndRounds() {
        User user = createUser("past-catalog");
        CsDomain domain = createDomain(10, "기출 도메인");
        CsDomainTrack track2020 = createPastExamTrack(domain, 1, 2020, "2020 기출");
        CsDomainTrack track2021 = createPastExamTrack(domain, 2, 2021, "2021 기출");

        CsStage stage2020Round1 = createStage(track2020, 1);
        createStage(track2020, 2);
        createStage(track2020, 3);
        createStage(track2020, 4);
        createStage(track2021, 1);
        createStage(track2021, 2);
        createStage(track2021, 3);
        createMultipleChoiceQuestion(stage2020Round1);

        CsPastExamCatalogResponse catalog = csPastExamService.getPastExamCatalog(user.getId());

        assertThat(catalog.years()).hasSize(6);

        CsPastExamYearResponse year2020 = catalog.years().stream()
                .filter(year -> year.year() == 2020)
                .findFirst()
                .orElseThrow();
        assertThat(year2020.rounds()).hasSize(4);
        CsPastExamRoundResponse round1 = year2020.rounds().get(0);
        assertThat(round1.roundNo()).isEqualTo(1);
        assertThat(round1.stageId()).isEqualTo(stage2020Round1.getId());
        assertThat(round1.questionCount()).isEqualTo(1);
        assertThat(round1.isReady()).isTrue();
        assertThat(round1.maxSolve()).isNull();

        CsPastExamYearResponse year2025 = catalog.years().stream()
                .filter(year -> year.year() == 2025)
                .findFirst()
                .orElseThrow();
        assertThat(year2025.rounds()).hasSize(3);
        assertThat(year2025.rounds().get(0).stageId()).isNull();
        assertThat(year2025.rounds().get(0).isReady()).isFalse();
        assertThat(year2025.rounds().get(0).maxSolve()).isNull();
    }

    @Test
    @DisplayName("기출 회차는 도메인 진행도 없이도 바로 시작할 수 있다")
    void startPastExamAttempt_withoutDomainProgress_succeeds() {
        User user = createUser("past-start");
        CsDomain domain = createDomain(10, "기출 도메인-진입");
        CsDomainTrack track2022 = createPastExamTrack(domain, 1, 2022, "2022 기출");
        CsStage round1 = createStage(track2022, 1);
        createMultipleChoiceQuestion(round1);

        CsAttemptStartResponse response = csPastExamService.startPastExamAttemptByRound(user.getId(), 2022, 1);

        assertThat(response.stageId()).isEqualTo(round1.getId());
        assertThat(response.totalQuestionCount()).isEqualTo(1);
        assertThat(response.firstQuestion()).isNotNull();
    }

    @Test
    @DisplayName("기출 카탈로그는 사용자별 stage 최고 정답 수(maxSolve)를 함께 반환한다")
    void catalog_includesMaxSolveByStage() {
        User user = createUser("past-max-solve");
        CsDomain domain = createDomain(10, "기출 도메인-최고기록");
        CsDomainTrack track2024 = createPastExamTrack(domain, 1, 2024, "2024 기출");
        CsStage stage2024Round1 = createStage(track2024, 1);
        createMultipleChoiceQuestion(stage2024Round1);

        csStageSolveRecordRepository.save(CsStageSolveRecord.builder()
                .user(user)
                .stage(stage2024Round1)
                .maxSolve(17)
                .build());

        CsPastExamCatalogResponse catalog = csPastExamService.getPastExamCatalog(user.getId());

        CsPastExamYearResponse year2024 = catalog.years().stream()
                .filter(year -> year.year() == 2024)
                .findFirst()
                .orElseThrow();
        CsPastExamRoundResponse round1 = year2024.rounds().stream()
                .filter(round -> round.roundNo() == 1)
                .findFirst()
                .orElseThrow();

        assertThat(round1.stageId()).isEqualTo(stage2024Round1.getId());
        assertThat(round1.maxSolve()).isEqualTo(17);
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

    private CsDomainTrack createPastExamTrack(CsDomain domain, int trackNo, int examYear, String name) {
        return csDomainTrackRepository.save(CsDomainTrack.builder()
                .domain(domain)
                .trackNo((short) trackNo)
                .name(name)
                .learningMode(CsTrackLearningMode.PAST_EXAM)
                .examYear((short) examYear)
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
                .prompt("기출 테스트 문제")
                .explanation("기출 테스트 해설")
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

        return question;
    }
}
