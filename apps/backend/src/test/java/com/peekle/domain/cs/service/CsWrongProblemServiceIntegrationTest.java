package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsWrongReviewAnswerRequest;
import com.peekle.domain.cs.dto.request.CsWrongReviewStartRequest;
import com.peekle.domain.cs.dto.response.CsWrongProblemPageResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewAnswerResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewCompleteResponse;
import com.peekle.domain.cs.dto.response.CsWrongReviewStartResponse;
import com.peekle.domain.cs.entity.CsDomain;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionChoice;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.entity.CsWrongProblem;
import com.peekle.domain.cs.enums.CsQuestionType;
import com.peekle.domain.cs.enums.CsWrongProblemStatus;
import com.peekle.domain.cs.repository.CsDomainRepository;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionChoiceRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.cs.repository.CsWrongProblemRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CsWrongProblemServiceIntegrationTest {

    @Autowired
    private CsWrongProblemService csWrongProblemService;

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

    @Test
    @DisplayName("오답 목록은 사용자/도메인/스테이지/상태 필터로 조회된다")
    void getWrongProblems_filtersByUserDomainStageAndStatus() {
        User user = createUser("wrong-list");
        User otherUser = createUser("wrong-list-other");

        CsDomain domainA = createDomain(501, "도메인 A");
        CsDomainTrack trackA = createTrack(domainA, 1, "트랙 A");
        CsStage stageA1 = createStage(trackA, 1);
        CsStage stageA2 = createStage(trackA, 2);

        CsDomain domainB = createDomain(502, "도메인 B");
        CsDomainTrack trackB = createTrack(domainB, 1, "트랙 B");
        CsStage stageB1 = createStage(trackB, 1);

        CsQuestion questionA1 = createMultipleChoiceQuestion(stageA1, "A1 문제");
        CsQuestion questionA1Cleared = createMultipleChoiceQuestion(stageA1, "A1 클리어 문제");
        CsQuestion questionA2 = createMultipleChoiceQuestion(stageA2, "A2 문제");
        CsQuestion questionB1 = createMultipleChoiceQuestion(stageB1, "B1 문제");

        saveWrongProblem(user, questionA1, CsWrongProblemStatus.ACTIVE, 2, 0);
        saveWrongProblem(user, questionA2, CsWrongProblemStatus.ACTIVE, 1, 0);
        saveWrongProblem(user, questionA1Cleared, CsWrongProblemStatus.CLEARED, 2, 1);
        saveWrongProblem(user, questionB1, CsWrongProblemStatus.ACTIVE, 1, 0);
        saveWrongProblem(otherUser, questionA1, CsWrongProblemStatus.ACTIVE, 3, 0);

        CsWrongProblemPageResponse activeInStageA1 = csWrongProblemService.getWrongProblems(
                user.getId(),
                domainA.getId(),
                stageA1.getId(),
                CsWrongProblemStatus.ACTIVE,
                0,
                20);
        assertThat(activeInStageA1.content()).hasSize(1);
        assertThat(activeInStageA1.content().get(0).questionId()).isEqualTo(questionA1.getId());
        assertThat(activeInStageA1.content().get(0).status()).isEqualTo(CsWrongProblemStatus.ACTIVE);

        CsWrongProblemPageResponse clearedInDomainA = csWrongProblemService.getWrongProblems(
                user.getId(),
                domainA.getId(),
                null,
                CsWrongProblemStatus.CLEARED,
                0,
                20);
        assertThat(clearedInDomainA.content()).hasSize(1);
        assertThat(clearedInDomainA.content().get(0).questionId()).isEqualTo(questionA1Cleared.getId());
        assertThat(clearedInDomainA.content().get(0).status()).isEqualTo(CsWrongProblemStatus.CLEARED);

        CsWrongProblemPageResponse allActive = csWrongProblemService.getWrongProblems(
                user.getId(),
                null,
                null,
                CsWrongProblemStatus.ACTIVE,
                0,
                20);
        assertThat(allActive.content()).hasSize(3);
        assertThat(allActive.content())
                .allSatisfy(item -> assertThat(item.status()).isEqualTo(CsWrongProblemStatus.ACTIVE));
    }

    @Test
    @DisplayName("오답 복습 제출 시 정답은 CLEARED, 오답은 ACTIVE로 상태가 갱신되고 결과가 집계된다")
    void wrongReview_flow_updatesStatusAndReturnsResult() {
        User user = createUser("wrong-review-flow");
        CsDomain domain = createDomain(503, "복습 도메인");
        CsDomainTrack track = createTrack(domain, 1, "복습 트랙");
        CsStage stage = createStage(track, 1);

        CsQuestion question1 = createMultipleChoiceQuestion(stage, "복습 문제 1");
        CsQuestion question2 = createMultipleChoiceQuestion(stage, "복습 문제 2");

        saveWrongProblem(user, question1, CsWrongProblemStatus.ACTIVE, 1, 0);
        saveWrongProblem(user, question2, CsWrongProblemStatus.ACTIVE, 1, 0);

        CsWrongReviewStartResponse startResponse = csWrongProblemService.startWrongReview(
                user.getId(),
                new CsWrongReviewStartRequest(domain.getId(), stage.getId(), 10));

        assertThat(startResponse.reviewId()).isNotBlank();
        assertThat(startResponse.totalQuestionCount()).isEqualTo(2);
        assertThat(startResponse.firstQuestion()).isNotNull();

        Long firstQuestionId = startResponse.firstQuestion().questionId();
        boolean firstIsQuestion1 = firstQuestionId.equals(question1.getId());
        int firstAnswer = firstIsQuestion1 ? 1 : 2;

        CsWrongReviewAnswerResponse firstAnswerResponse = csWrongProblemService.submitWrongReviewAnswer(
                user.getId(),
                startResponse.reviewId(),
                new CsWrongReviewAnswerRequest(firstQuestionId, firstAnswer, null));

        assertThat(firstAnswerResponse.isCorrect()).isEqualTo(firstIsQuestion1);
        assertThat(firstAnswerResponse.isLast()).isFalse();
        assertThat(firstAnswerResponse.nextQuestion()).isNotNull();

        Long secondQuestionId = firstAnswerResponse.nextQuestion().questionId();
        boolean secondShouldBeCorrect = secondQuestionId.equals(question1.getId());
        int secondAnswer = secondShouldBeCorrect ? 1 : 2;

        CsWrongReviewAnswerResponse secondAnswerResponse = csWrongProblemService.submitWrongReviewAnswer(
                user.getId(),
                startResponse.reviewId(),
                new CsWrongReviewAnswerRequest(secondQuestionId, secondAnswer, null));

        assertThat(secondAnswerResponse.isLast()).isTrue();
        assertThat(secondAnswerResponse.nextQuestion()).isNull();

        CsWrongReviewCompleteResponse completeResponse = csWrongProblemService.completeWrongReview(
                user.getId(),
                startResponse.reviewId());

        assertThat(completeResponse.totalQuestionCount()).isEqualTo(2);
        assertThat(completeResponse.correctCount()).isEqualTo(1);
        assertThat(completeResponse.wrongCount()).isEqualTo(1);
        assertThat(completeResponse.clearedCount()).isEqualTo(1);
        assertThat(completeResponse.remainedActiveCount()).isEqualTo(1);

        Long correctQuestionId = firstAnswerResponse.isCorrect() ? firstQuestionId : secondQuestionId;
        Long wrongQuestionId = firstAnswerResponse.isCorrect() ? secondQuestionId : firstQuestionId;

        CsWrongProblem correctProblem = csWrongProblemRepository
                .findByUser_IdAndQuestion_Id(user.getId(), correctQuestionId)
                .orElseThrow();
        CsWrongProblem wrongProblem = csWrongProblemRepository
                .findByUser_IdAndQuestion_Id(user.getId(), wrongQuestionId)
                .orElseThrow();

        assertThat(correctProblem.getStatus()).isEqualTo(CsWrongProblemStatus.CLEARED);
        assertThat(correctProblem.getWrongCount()).isEqualTo(2);
        assertThat(wrongProblem.getStatus()).isEqualTo(CsWrongProblemStatus.ACTIVE);
        assertThat(wrongProblem.getWrongCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("ACTIVE 오답이 없으면 복습 시작 응답은 빈 세션으로 반환된다")
    void startWrongReview_returnsEmptySessionWhenNoActiveWrongProblem() {
        User user = createUser("wrong-review-empty");
        CsDomain domain = createDomain(504, "빈 복습 도메인");
        CsDomainTrack track = createTrack(domain, 1, "빈 복습 트랙");
        CsStage stage = createStage(track, 1);
        CsQuestion question = createMultipleChoiceQuestion(stage, "빈 복습 문제");

        saveWrongProblem(user, question, CsWrongProblemStatus.CLEARED, 1, 1);

        CsWrongReviewStartResponse response = csWrongProblemService.startWrongReview(
                user.getId(),
                new CsWrongReviewStartRequest(domain.getId(), stage.getId(), 10));

        assertThat(response.reviewId()).isNull();
        assertThat(response.totalQuestionCount()).isZero();
        assertThat(response.firstQuestion()).isNull();
    }

    @Test
    @DisplayName("복습 시작 문제 수는 최대 10개로 제한된다")
    void startWrongReview_capsAtTenQuestions() {
        User user = createUser("wrong-review-cap");
        CsDomain domain = createDomain(505, "복습 제한 도메인");
        CsDomainTrack track = createTrack(domain, 1, "복습 제한 트랙");
        CsStage stage = createStage(track, 1);

        for (int i = 0; i < 12; i++) {
            CsQuestion question = createMultipleChoiceQuestion(stage, "복습 제한 문제 " + i);
            saveWrongProblem(user, question, CsWrongProblemStatus.ACTIVE, 1, 0);
        }

        CsWrongReviewStartResponse response = csWrongProblemService.startWrongReview(
                user.getId(),
                new CsWrongReviewStartRequest(domain.getId(), stage.getId(), 20));

        assertThat(response.totalQuestionCount()).isEqualTo(10);
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
                .content("정답")
                .isAnswer(true)
                .build());
        csQuestionChoiceRepository.save(CsQuestionChoice.builder()
                .question(question)
                .choiceNo((short) 2)
                .content("오답")
                .isAnswer(false)
                .build());

        return question;
    }

    private void saveWrongProblem(
            User user,
            CsQuestion question,
            CsWrongProblemStatus status,
            int wrongCount,
            int reviewCorrectCount) {
        LocalDateTime now = LocalDateTime.now();
        csWrongProblemRepository.save(CsWrongProblem.builder()
                .user(user)
                .question(question)
                .domain(question.getStage().getTrack().getDomain())
                .status(status)
                .wrongCount(wrongCount)
                .reviewCorrectCount(reviewCorrectCount)
                .lastWrongAt(now.minusMinutes(1))
                .clearedAt(status == CsWrongProblemStatus.CLEARED ? now : null)
                .updatedAt(now)
                .build());
    }
}
