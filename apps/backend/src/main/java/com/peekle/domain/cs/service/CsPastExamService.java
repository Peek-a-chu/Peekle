package com.peekle.domain.cs.service;

import com.peekle.domain.cs.dto.response.CsAttemptStartResponse;
import com.peekle.domain.cs.dto.response.CsPastExamCatalogResponse;
import com.peekle.domain.cs.dto.response.CsPastExamRoundResponse;
import com.peekle.domain.cs.dto.response.CsPastExamYearResponse;
import com.peekle.domain.cs.entity.CsDomainTrack;
import com.peekle.domain.cs.entity.CsStageSolveRecord;
import com.peekle.domain.cs.entity.CsStage;
import com.peekle.domain.cs.enums.CsTrackLearningMode;
import com.peekle.domain.cs.repository.CsDomainTrackRepository;
import com.peekle.domain.cs.repository.CsQuestionRepository;
import com.peekle.domain.cs.repository.CsStageSolveRecordRepository;
import com.peekle.domain.cs.repository.CsStageRepository;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CsPastExamService {

    private static final int PAST_EXAM_DOMAIN_ID = 10;
    private static final short MIN_EXAM_YEAR = 2020;
    private static final short MAX_EXAM_YEAR = 2025;

    private final CsDomainTrackRepository csDomainTrackRepository;
    private final CsStageRepository csStageRepository;
    private final CsQuestionRepository csQuestionRepository;
    private final CsStageSolveRecordRepository csStageSolveRecordRepository;
    private final CsAttemptService csAttemptService;
    private final UserRepository userRepository;

    public CsPastExamCatalogResponse getPastExamCatalog(Long userId) {
        assertUser(userId);

        List<CsDomainTrack> tracks = csDomainTrackRepository
                .findByDomain_IdAndLearningModeAndExamYearBetweenOrderByExamYearAscTrackNoAsc(
                        PAST_EXAM_DOMAIN_ID,
                        CsTrackLearningMode.PAST_EXAM,
                        MIN_EXAM_YEAR,
                        MAX_EXAM_YEAR);

        Map<Integer, CsDomainTrack> representativeTrackByYear = new HashMap<>();
        for (CsDomainTrack track : tracks) {
            if (track.getExamYear() == null) {
                continue;
            }
            representativeTrackByYear.putIfAbsent((int) track.getExamYear(), track);
        }

        Map<Integer, Map<Integer, CsStage>> stageByYearAndRound = new HashMap<>();
        List<Long> allStageIds = new ArrayList<>();
        for (Map.Entry<Integer, CsDomainTrack> entry : representativeTrackByYear.entrySet()) {
            Integer year = entry.getKey();
            CsDomainTrack track = entry.getValue();
            List<CsStage> stages = csStageRepository.findByTrack_IdOrderByStageNoAsc(track.getId());
            Map<Integer, CsStage> byRound = new HashMap<>();
            for (CsStage stage : stages) {
                byRound.put((int) stage.getStageNo(), stage);
                allStageIds.add(stage.getId());
            }
            stageByYearAndRound.put(year, byRound);
        }

        Map<Long, Integer> questionCountByStageId = new HashMap<>();
        if (!allStageIds.isEmpty()) {
            List<CsQuestionRepository.StageQuestionCountProjection> rows =
                    csQuestionRepository.countActiveQuestionsByStageIds(allStageIds);
            for (CsQuestionRepository.StageQuestionCountProjection row : rows) {
                questionCountByStageId.put(row.getStageId(), Math.toIntExact(row.getQuestionCount()));
            }
        }
        Map<Long, Integer> maxSolveByStageId = new HashMap<>();
        if (!allStageIds.isEmpty()) {
            List<CsStageSolveRecord> rows = csStageSolveRecordRepository.findByUser_IdAndStage_IdIn(userId, allStageIds);
            for (CsStageSolveRecord row : rows) {
                if (row.getStage() == null || row.getStage().getId() == null) {
                    continue;
                }
                maxSolveByStageId.put(row.getStage().getId(), row.getMaxSolve());
            }
        }

        List<CsPastExamYearResponse> years = new ArrayList<>();
        for (int year = MIN_EXAM_YEAR; year <= MAX_EXAM_YEAR; year++) {
            int roundLimit = expectedRoundCount((short) year);
            Map<Integer, CsStage> stageByRound = stageByYearAndRound.getOrDefault(year, Map.of());
            List<CsPastExamRoundResponse> rounds = new ArrayList<>(roundLimit);

            for (int roundNo = 1; roundNo <= roundLimit; roundNo++) {
                CsStage stage = stageByRound.get(roundNo);
                Long stageId = stage == null ? null : stage.getId();
                int questionCount = stageId == null ? 0 : questionCountByStageId.getOrDefault(stageId, 0);
                boolean isReady = stageId != null && questionCount > 0;
                Integer maxSolve = stageId == null ? null : maxSolveByStageId.get(stageId);
                rounds.add(new CsPastExamRoundResponse(roundNo, stageId, questionCount, isReady, maxSolve));
            }

            years.add(new CsPastExamYearResponse(year, rounds));
        }

        return new CsPastExamCatalogResponse(years);
    }

    public CsAttemptStartResponse startPastExamAttemptByRound(Long userId, int year, int roundNo) {
        assertUser(userId);
        validateYearAndRound(year, roundNo);

        List<CsDomainTrack> tracks = csDomainTrackRepository.findByDomain_IdAndLearningModeAndExamYearOrderByTrackNoAsc(
                PAST_EXAM_DOMAIN_ID,
                CsTrackLearningMode.PAST_EXAM,
                (short) year);

        if (tracks.isEmpty()) {
            throw new BusinessException(ErrorCode.CS_TRACK_NOT_FOUND, year + "년 기출 트랙을 찾을 수 없습니다.");
        }

        CsDomainTrack track = tracks.get(0);
        CsStage stage = csStageRepository.findByTrack_IdAndStageNo(track.getId(), (short) roundNo)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.CS_STAGE_NOT_FOUND,
                        year + "년 " + roundNo + "회차 스테이지를 찾을 수 없습니다."));

        return csAttemptService.startStageAttempt(userId, stage.getId());
    }

    private void validateYearAndRound(int year, int roundNo) {
        if (year < MIN_EXAM_YEAR || year > MAX_EXAM_YEAR) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    "year는 " + MIN_EXAM_YEAR + "년부터 " + MAX_EXAM_YEAR + "년까지 가능합니다.");
        }
        int maxRound = expectedRoundCount((short) year);
        if (roundNo < 1 || roundNo > maxRound) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT_VALUE,
                    year + "년은 1회차부터 " + maxRound + "회차까지만 지원합니다.");
        }
    }

    private int expectedRoundCount(short year) {
        return year == 2020 ? 4 : 3;
    }

    private void assertUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
