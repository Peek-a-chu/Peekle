package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.curriculum.ProblemStatusResponse;
import com.peekle.domain.study.dto.ide.StudyProblemDraftResponse;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.service.RedisIdeService;
import com.peekle.domain.study.service.StudyMemberProgressService;
import com.peekle.domain.study.service.StudyProblemDraftService;
import com.peekle.domain.study.service.StudyCurriculumService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyCurriculumController {

    private final StudyCurriculumService studyCurriculumService;
    private final com.peekle.domain.study.service.RedisStudyProblemService redisStudyProblemService;
    private final com.peekle.global.redis.RedisPublisher redisPublisher;
    private final RedisIdeService redisIdeService;
    private final StudyProblemDraftService studyProblemDraftService;
    private final StudyMemberProgressService studyMemberProgressService;
    private final StudyMemberRepository studyMemberRepository;

    /**
     * 커스텀 문제 설명 저장
     */
    @PostMapping("/{studyId}/problems/{studyProblemId}/description")
    public ApiResponse<Void> saveDescription(
            @PathVariable Long studyId,
            @PathVariable Long studyProblemId,
            @RequestBody java.util.Map<String, String> request) {
        String description = request.get("description");
        redisStudyProblemService.saveDescription(studyProblemId, description);

        // 실시간 동기화 알림 발송
        String topic = String.format(com.peekle.global.redis.RedisKeyConst.TOPIC_STUDY_PROBLEM_DESC, studyId,
                studyProblemId);
        redisPublisher.publish(new org.springframework.data.redis.listener.ChannelTopic(topic),
                com.peekle.global.socket.SocketResponse.of("UPDATE", description));

        return ApiResponse.success();
    }

    /**
     * 커스텀 문제 설명 조회
     */
    @GetMapping("/{studyId}/problems/{studyProblemId}/description")
    public ApiResponse<String> getDescription(
            @PathVariable Long studyId,
            @PathVariable Long studyProblemId) {
        String description = redisStudyProblemService.getDescription(studyProblemId);
        return ApiResponse.success(description);
    }

    /**
     * 일별 문제 및 풀이 현황 조회
     * GET /api/studies/{id}/curriculum/daily?date=2026-01-26
     */
    @GetMapping("/{studyId}/curriculum/daily")
    public ApiResponse<List<ProblemStatusResponse>> getDailyCurriculum(
            @PathVariable Long studyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Long userId) {

        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        List<ProblemStatusResponse> response = studyCurriculumService.getDailyProblems(userId, studyId, targetDate);

        System.out.println("DEBUG DailyCurriculum: " + response.toString());
        return ApiResponse.success(response);
    }

    @GetMapping("/{studyId}/ide/active-problem/{targetUserId}")
    public ApiResponse<Map<String, Object>> getActiveProblem(
            @PathVariable Long studyId,
            @PathVariable Long targetUserId,
            @AuthenticationPrincipal Long userId) {
        if (userId == null) {
            return ApiResponse.success(Map.of());
        }

        StudyRoom studyRef = StudyRoom.builder().id(studyId).build();
        boolean requesterInStudy = studyMemberRepository.existsByStudyAndUser_Id(studyRef, userId);
        boolean targetInStudy = studyMemberRepository.existsByStudyAndUser_Id(studyRef, targetUserId);

        if (!requesterInStudy || !targetInStudy) {
            return ApiResponse.success(Map.of());
        }

        return ApiResponse.success(redisIdeService.getActiveProblem(studyId, targetUserId));
    }

    @GetMapping("/{studyId}/problems/{studyProblemId}/draft")
    public ApiResponse<StudyProblemDraftResponse> getProblemDraft(
            @PathVariable Long studyId,
            @PathVariable Long studyProblemId,
            @AuthenticationPrincipal Long userId) {
        if (userId == null) {
            return ApiResponse.success(null);
        }

        return ApiResponse.success(
                studyProblemDraftService.getDraft(studyId, userId, studyProblemId).orElse(null));
    }

    @PostMapping("/{studyId}/problems/{studyProblemId}/draft")
    public ApiResponse<Void> saveProblemDraft(
            @PathVariable Long studyId,
            @PathVariable Long studyProblemId,
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> request) {
        if (userId == null) {
            return ApiResponse.success();
        }

        String code = request.getOrDefault("code", "");
        String language = request.get("language");
        studyProblemDraftService.saveDraft(studyId, userId, studyProblemId, code, language);
        return ApiResponse.success();
    }

    @GetMapping("/{studyId}/last-active-problem")
    public ApiResponse<Map<String, Object>> getLastActiveProblem(
            @PathVariable Long studyId,
            @AuthenticationPrincipal Long userId) {
        if (userId == null) {
            return ApiResponse.success(Map.of());
        }

        StudyRoom studyRef = StudyRoom.builder().id(studyId).build();
        boolean requesterInStudy = studyMemberRepository.existsByStudyAndUser_Id(studyRef, userId);
        if (!requesterInStudy) {
            return ApiResponse.success(Map.of());
        }

        return ApiResponse.success(
                studyMemberProgressService.getLastStudyProblem(studyId, userId)
                        .<Map<String, Object>>map(problem -> Map.of(
                                "studyProblemId", problem.getId(),
                                "problemDate", problem.getProblemDate().toString()))
                        .orElseGet(Map::of));
    }
}
