package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsAttemptAnswerRequest;
import com.peekle.domain.cs.dto.response.CsAttemptAnswerResponse;
import com.peekle.domain.cs.dto.response.CsAttemptCompleteResponse;
import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsQuestionShortAnswer;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsAttemptPhase;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsQuestionShortAnswerRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsUserDomainProgressRepository;
import com.peekle.domain.cs.repository.CsWrongProblemRepository;
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
    private CsQuestionShortAnswerRepository csQuestionShortAnswerRepository;

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
        assertThat(completeResponse.earnedScore()).isEqualTo(1);
        assertThat(completeResponse.totalScore()).isEqualTo(1);

        CsWrongProblem wrongProblem = csWrongProblemRepository.findByUser_IdAndQuestion_Id(user.getId(), firstQuestion.getId())
                .orElseThrow();
        assertThat(wrongProblem.getStatus()).isEqualTo(CsWrongProblemStatus.ACTIVE);
        assertThat(wrongProblem.getWrongCount()).isEqualTo(2);
        assertThat(userRepository.findById(user.getId()))
                .get()
                .satisfies(savedUser -> assertThat(savedUser.getLeaguePoint()).isEqualTo(1));
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
        assertThat(completeResponse.earnedScore()).isEqualTo(1);
        assertThat(completeResponse.totalScore()).isEqualTo(1);

        assertThat(csUserDomainProgressRepository.findByUser_IdAndDomain_Id(user.getId(), domain.getId()))
                .get()
                .satisfies(progress -> assertThat(progress.getCurrentStageNo()).isEqualTo((short) 2));
    }

    @Test
    @DisplayName("객관식 오답 제출 시 실제 정답 번호/내용/해설을 반환하고 is_answer 기준으로 채점한다")
    void multipleChoice_wrongAnswer_returnsCorrectAnswerAndExplanation() {
        User user = createUser("attempt-feedback");
        CsDomain domain = createDomain(403, "피드백 도메인");
        CsDomainTrack track = createTrack(domain, 1, "피드백 트랙");
        CsStage stage = createStage(track, 1);

        CsQuestion question = csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(CsQuestionType.MULTIPLE_CHOICE)
                .prompt("정답 공개 테스트 문제")
                .explanation("정답은 2번입니다.")
                .isActive(true)
                .build());

        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 1)
                .content("선지 1")
                .isAnswer(false)
                .build());
        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 2)
                .content("선지 2")
                .isAnswer(true)
                .build());

        csDomainService.addMyDomain(user.getId(), domain.getId());
        csAttemptService.startStageAttempt(user.getId(), stage.getId());

        CsAttemptAnswerResponse response = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), 1, null));

        assertThat(response.isCorrect()).isFalse();
        assertThat(response.correctChoiceNo()).isEqualTo(2);
        assertThat(response.correctAnswer()).isEqualTo("2. 선지 2");
        assertThat(response.feedback()).contains("정답: 2. 선지 2");
        assertThat(response.feedback()).contains("해설: 정답은 2번입니다.");
    }

    @Test
    @DisplayName("단답형 채점은 공백/대소문자/특수문자 정규화 정책을 적용한다")
    void shortAnswer_grading_appliesNormalizationPolicy() {
        User user = createUser("short-normalize");
        CsDomain domain = createDomain(404, "단답형 정규화 도메인");
        CsDomainTrack track = createTrack(domain, 1, "단답형 정규화 트랙");
        CsStage stage = createStage(track, 1);

        CsQuestion firstQuestion = createShortAnswerQuestion(stage, "중복 제거 키워드를 작성하시오.");
        addShortAnswer(firstQuestion, "DISTINCT", "distinct", true);

        CsQuestion secondQuestion = createShortAnswerQuestion(stage, "깊은 복사 코드를 작성하시오.");
        addShortAnswer(secondQuestion, "copy.deepcopy(a)", "copy.deepcopy(a)", true);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        csAttemptService.startStageAttempt(user.getId(), stage.getId());

        CsAttemptAnswerResponse firstAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(firstQuestion.getId(), null, "   diST inCt   "));
        assertThat(firstAnswer.isCorrect()).isTrue();
        assertThat(firstAnswer.phase()).isEqualTo(CsAttemptPhase.FIRST_PASS);

        CsAttemptAnswerResponse secondAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(secondQuestion.getId(), null, "COPY DEEPCOPY A"));
        assertThat(secondAnswer.isCorrect()).isTrue();
        assertThat(secondAnswer.phase()).isEqualTo(CsAttemptPhase.COMPLETED);
    }

    @Test
    @DisplayName("단답형 오답 제출 시 대표 정답을 반환하고 완료 시 오답노트에 저장된다")
    void shortAnswer_wrongAnswer_returnsPrimaryAnswerAndPersistsWrongProblem() {
        User user = createUser("short-wrong");
        CsDomain domain = createDomain(405, "단답형 오답 도메인");
        CsDomainTrack track = createTrack(domain, 1, "단답형 오답 트랙");
        CsStage stage = createStage(track, 1);

        CsQuestion question = createShortAnswerQuestion(stage, "트랜잭션 4대 성질 약어를 작성하시오.");
        addShortAnswer(question, "ACID", "acid", true);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        csAttemptService.startStageAttempt(user.getId(), stage.getId());

        CsAttemptAnswerResponse firstAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), null, "BASE"));
        assertThat(firstAnswer.isCorrect()).isFalse();
        assertThat(firstAnswer.correctAnswer()).isEqualTo("ACID");
        assertThat(firstAnswer.feedback()).contains("정답: ACID");
        assertThat(firstAnswer.phase()).isEqualTo(CsAttemptPhase.RETRY_WRONG);

        CsAttemptAnswerResponse retryAnswer = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), null, "acid"));
        assertThat(retryAnswer.isCorrect()).isTrue();
        assertThat(retryAnswer.phase()).isEqualTo(CsAttemptPhase.COMPLETED);

        csAttemptService.completeAttempt(user.getId(), stage.getId());

        CsWrongProblem wrongProblem = csWrongProblemRepository
                .findByUser_IdAndQuestion_Id(user.getId(), question.getId())
                .orElseThrow();
        assertThat(wrongProblem.getWrongCount()).isEqualTo(1);
        assertThat(wrongProblem.getStatus()).isEqualTo(CsWrongProblemStatus.ACTIVE);
    }

    @Test
    @DisplayName("단답형 빈값 또는 공백만 입력은 CS_INVALID_ANSWER_PAYLOAD를 반환한다")
    void shortAnswer_blankInput_throwsInvalidPayload() {
        User user = createUser("short-blank");
        CsDomain domain = createDomain(406, "단답형 빈값 도메인");
        CsDomainTrack track = createTrack(domain, 1, "단답형 빈값 트랙");
        CsStage stage = createStage(track, 1);

        CsQuestion question = createShortAnswerQuestion(stage, "정답을 입력하시오.");
        addShortAnswer(question, "JSON", "json", true);

        csDomainService.addMyDomain(user.getId(), domain.getId());
        csAttemptService.startStageAttempt(user.getId(), stage.getId());

        assertThatThrownBy(() -> csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), null, "   ")))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> {
                    BusinessException businessException = (BusinessException) exception;
                    assertThat(businessException.getErrorCode()).isEqualTo(ErrorCode.CS_INVALID_ANSWER_PAYLOAD);
                });
    }

    @Test
    @DisplayName("같은 문제를 다시 틀려도 오답 레코드는 중복 생성되지 않고 wrongCount만 누적된다")
    void sameQuestionWrongAgain_updatesSingleWrongProblem() {
        User user = createUser("wrong-duplicate-check");
        CsDomain domain = createDomain(407, "중복 검증 도메인");
        CsDomainTrack track = createTrack(domain, 1, "중복 검증 트랙");
        CsStage stage = createStage(track, 1);
        CsQuestion question = createMultipleChoiceQuestion(stage, "중복 검증 문제");

        csDomainService.addMyDomain(user.getId(), domain.getId());

        // 첫 번째 시도: 1회 오답 후 정답 완료
        csAttemptService.startStageAttempt(user.getId(), stage.getId());
        CsAttemptAnswerResponse firstWrong = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), 2, null));
        assertThat(firstWrong.isCorrect()).isFalse();

        CsAttemptAnswerResponse firstRetryCorrect = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), 1, null));
        assertThat(firstRetryCorrect.isCorrect()).isTrue();
        assertThat(firstRetryCorrect.isLast()).isTrue();
        csAttemptService.completeAttempt(user.getId(), stage.getId());

        // 두 번째 시도(예전 스테이지 재도전): 다시 1회 오답 후 정답 완료
        csAttemptService.startStageAttempt(user.getId(), stage.getId());
        CsAttemptAnswerResponse secondWrong = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), 2, null));
        assertThat(secondWrong.isCorrect()).isFalse();

        CsAttemptAnswerResponse secondRetryCorrect = csAttemptService.submitAnswer(
                user.getId(),
                stage.getId(),
                new CsAttemptAnswerRequest(question.getId(), 1, null));
        assertThat(secondRetryCorrect.isCorrect()).isTrue();
        assertThat(secondRetryCorrect.isLast()).isTrue();
        csAttemptService.completeAttempt(user.getId(), stage.getId());

        long wrongProblemRowCount = csWrongProblemRepository.findAll().stream()
                .filter(wrongProblem -> wrongProblem.getUser().getId().equals(user.getId()))
                .filter(wrongProblem -> wrongProblem.getQuestion().getId().equals(question.getId()))
                .count();

        CsWrongProblem wrongProblem = csWrongProblemRepository
                .findByUser_IdAndQuestion_Id(user.getId(), question.getId())
                .orElseThrow();

        assertThat(wrongProblemRowCount).isEqualTo(1L);
        assertThat(wrongProblem.getWrongCount()).isEqualTo(2);
        assertThat(wrongProblem.getStatus()).isEqualTo(CsWrongProblemStatus.ACTIVE);
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

    private CsQuestion createShortAnswerQuestion(CsStage stage, String prompt) {
        return csQuestionRepository.save(CsQuestion.builder()
                .stage(stage)
                .questionType(CsQuestionType.SHORT_ANSWER)
                .prompt(prompt)
                .explanation("단답형 테스트 해설")
                .isActive(true)
                .build());
    }

    private void addShortAnswer(CsQuestion question, String answerText, String normalizedAnswer, boolean isPrimary) {
        csQuestionShortAnswerRepository.save(CsQuestionShortAnswer.builder()
                .question(question)
                .answerText(answerText)
                .normalizedAnswer(normalizedAnswer)
                .isPrimary(isPrimary)
                .build());
    }
}
