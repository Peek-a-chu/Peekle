package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsAttemptPhase;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsWrongProblemRepository;
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
class CsAttemptFlowIntegrationTest {

    @Autowired
    private CsAttemptService csAttemptService;

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
    private CsWrongProblemRepository csWrongProblemRepository;

    @Autowired
    private CsUserDomainProgressRepository csUserDomainProgressRepository;

    @Test
    @DisplayName("오답이 남아있으면 재풀이 라운드를 반복하고 완료 시 오답노트에 누적 저장한다")
    void attemptFlow_retriesAndPersistsWrongProblems() {
        User user = createUser("attempt-flow");
        CsDomain domain = createDomain(401, "CS 시도 도메인");
        CsDomainTrack track = createTrack(domain, 1, "CS 시도 트랙");
        CsStage stage = createStage(track, 1);
        CsQuestion firstQuestion = createMultipleChoiceQuestion(stage, "첫 번째 문제");
        createMultipleChoiceQuestion(stage, "두 번째 문제");

        csDomainService.addMyDomain(user.getId(), domain.getId());

        CsAttemptStartResponse startResponse = csAttemptService.startStageAttempt(user.getId(), stage.getId());
        assertThat(startResponse.firstQuestion().questionId()).isEqualTo(firstQuestion.getId());

        CsAttemptAnswerResponse firstAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(firstQuestion.getId(), 2, null));
        assertThat(firstAnswer.isCorrect()).isFalse();
        assertThat(firstAnswer.phase()).isEqualTo(CsAttemptPhase.FIRST_PASS);

        Long secondQuestionId = firstAnswer.nextQuestion().questionId();
        CsAttemptAnswerResponse secondAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(secondQuestionId, 1, null));
        assertThat(secondAnswer.isCorrect()).isTrue();
        assertThat(secondAnswer.phase()).isEqualTo(CsAttemptPhase.RETRY_WRONG);
        assertThat(secondAnswer.nextQuestion().questionId()).isEqualTo(firstQuestion.getId());

        CsAttemptAnswerResponse thirdAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(firstQuestion.getId(), 2, null));
        assertThat(thirdAnswer.isCorrect()).isFalse();
        assertThat(thirdAnswer.phase()).isEqualTo(CsAttemptPhase.RETRY_WRONG);

        CsAttemptAnswerResponse fourthAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(firstQuestion.getId(), 1, null));
        assertThat(fourthAnswer.isCorrect()).isTrue();
        assertThat(fourthAnswer.isLast()).isTrue();
        assertThat(fourthAnswer.phase()).isEqualTo(CsAttemptPhase.COMPLETED);

        CsAttemptCompleteResponse completeResponse = csAttemptService.completeAttempt(user.getId(), stage.getId());
        assertThat(completeResponse.correctCount()).isEqualTo(1);
        assertThat(completeResponse.wrongCount()).isEqualTo(1);
        assertThat(completeResponse.correctRate()).isEqualTo(50);

        CsWrongProblem wrongProblem = csWrongProblemRepository.findByUser_IdAndQuestion_Id(user.getId(), firstQuestion.getId())
                .orElseThrow();
        assertThat(wrongProblem.getStatus()).isEqualTo(CsWrongProblemStatus.ACTIVE);
        assertThat(wrongProblem.getWrongCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("현재 진행 스테이지 완료 시 다음 스테이지가 해금되고 결과 응답에 nextStageId가 포함된다")
    void completeAttempt_unlocksNextStage() {
        User user = createUser("attempt-progress");
        CsDomain domain = createDomain(402, "진행도 도메인");
        CsDomainTrack track = createTrack(domain, 1, "진행도 트랙");
        CsStage stage1 = createStage(track, 1);
        CsStage stage2 = createStage(track, 2);
        CsQuestion question = createMultipleChoiceQuestion(stage1, "진행도 문제");

        csDomainService.addMyDomain(user.getId(), domain.getId());

        csAttemptService.startStageAttempt(user.getId(), stage1.getId());
        CsAttemptAnswerResponse answer = csAttemptService.submitAnswer(
                user.getId(),
                stage1.getId(),
                new CsAttemptAnswerRequest(question.getId(), 1, null));
        assertThat(answer.isLast()).isTrue();
        assertThat(answer.phase()).isEqualTo(CsAttemptPhase.COMPLETED);

        CsAttemptCompleteResponse completeResponse = csAttemptService.completeAttempt(user.getId(), stage1.getId());
        assertThat(completeResponse.isTrackCompleted()).isFalse();
        assertThat(completeResponse.nextStageId()).isEqualTo(stage2.getId());

        assertThat(csUserDomainProgressRepository.findByUser_IdAndDomain_Id(user.getId(), domain.getId()))
                .get()
                .satisfies(progress -> assertThat(progress.getCurrentStageNo()).isEqualTo((short) 2));
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

    private CsQuestion createMultipleChoiceQuestion(CsStage stage, String prompt) {
        CsQuestion question = csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(CsQuestionType.MULTIPLE_CHOICE)
                .prompt(prompt)
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

        return question;
    }
}
