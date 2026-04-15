package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.request.CsQuestionClaimCreateRequest;
import com.peekle.domain.cs.dto.response.CsQuestionClaimSubmitResponse;
import com.peekle.domain.cs.entity.CsQuestion;
import com.peekle.domain.cs.entity.CsQuestionClaim;
import com.peekle.domain.cs.repository.CsQuestionClaimRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsQuestionClaimService {

    private static final int DAILY_CLAIM_LIMIT = 5;
    private static final int SAME_QUESTION_COOLDOWN_HOURS = 24;
    private static final ZoneId KST_ZONE = ZoneId.of("Asia/Seoul");

    private final CsQuestionClaimRepository csQuestionClaimRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final UserRepository userRepository;

    @Transactional
    public CsQuestionClaimSubmitResponse submitClaim(
            Long userId,
            Long stageId,
            CsQuestionClaimCreateRequest request) {
        User user = getUser(userId);
        CsQuestion question = csQuestionRepository.findByIdAndStage_Id(request.questionId(), stageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CS_QUESTION_NOT_FOUND));

        String normalizedDescription = request.description().trim();
        if (normalizedDescription.length() < 10) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "신고 내용은 최소 10자 이상 입력해주세요.");
        }

        validateDailyLimit(userId);
        validateSameQuestionCooldown(userId, question.getId());

        Short selectedChoiceNo = toOptionalShort(request.selectedChoiceNo());
        String submittedAnswer = normalizeOptionalText(request.submittedAnswer());

        CsQuestionClaim saved = csQuestionClaimRepository.save(CsQuestionClaim.builder()
                .user(user)
                .stage(question.getStage())
                .question(question)
                .claimType(request.claimType())
                .description(normalizedDescription)
                .isCorrect(request.isCorrect())
                .selectedChoiceNo(selectedChoiceNo)
                .submittedAnswer(submittedAnswer)
                .build());

        return new CsQuestionClaimSubmitResponse(
                saved.getId(),
                saved.getQuestion().getId(),
                saved.getClaimType(),
                saved.getStatus(),
                saved.getCreatedAt());
    }

    private void validateDailyLimit(Long userId) {
        LocalDateTime startOfDay = LocalDate.now(KST_ZONE).atStartOfDay();
        long todayCount = csQuestionClaimRepository.countByUser_IdAndCreatedAtGreaterThanEqual(userId, startOfDay);
        if (todayCount >= DAILY_CLAIM_LIMIT) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "하루 신고 가능 횟수(5회)를 초과했습니다.");
        }
    }

    private void validateSameQuestionCooldown(Long userId, Long questionId) {
        LocalDateTime now = ZonedDateTime.now(KST_ZONE).toLocalDateTime();
        LocalDateTime since = now.minusHours(SAME_QUESTION_COOLDOWN_HOURS);
        boolean alreadyClaimedRecently = csQuestionClaimRepository
                .existsByUser_IdAndQuestion_IdAndCreatedAtGreaterThanEqual(userId, questionId, since);

        if (alreadyClaimedRecently) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "동일 문제는 24시간에 1회만 신고할 수 있습니다.");
        }
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private Short toOptionalShort(Integer value) {
        if (value == null) {
            return null;
        }
        if (value < 1 || value > Short.MAX_VALUE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE, "선택 번호 값이 올바르지 않습니다.");
        }
        return value.shortValue();
    }

    private String normalizeOptionalText(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
