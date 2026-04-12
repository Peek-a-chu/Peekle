package com.peekle.domain.ai.service;

import com.peekle.domain.ai.dto.request.TagStatDto;
import com.peekle.domain.ai.dto.request.UserActivityRequest;
import com.peekle.domain.ai.dto.request.CandidateProblemDto;
import com.peekle.domain.ai.dto.response.AiApiResponse;
import com.peekle.domain.ai.dto.response.DailyRecommendationResponse;
import com.peekle.domain.ai.dto.response.RecommendationResponse;
import com.peekle.domain.ai.dto.response.RecommendationResponse.RecommendedProblem;
import com.peekle.domain.ai.entity.RecommendFeedback;
import com.peekle.domain.ai.entity.RecommendProblem;
import com.peekle.domain.ai.enums.RecommendationFeedbackType;
import com.peekle.domain.ai.enums.RecommendationRefreshType;
import com.peekle.domain.ai.repository.RecommendFeedbackRepository;
import com.peekle.domain.ai.repository.RecommendProblemRepository;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import com.peekle.global.util.SolvedAcLevelUtil;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {
    private final SubmissionLogRepository logRepository;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final RecommendProblemRepository recommendProblemRepository;
    private final RecommendFeedbackRepository recommendFeedbackRepository;
    private final RestClient aiRestClient; 

    private static final int TARGET_RECOMMENDATION_COUNT = 3;
    private static final int CANDIDATE_POOL_SIZE = 120;
    private static final int AI_CANDIDATE_LIMIT = 15;
    private static final int MIN_REC_LEVEL_X10 = 10;
    private static final int MAX_REC_LEVEL_X10 = 300;
    private static final int LONG_WINDOW_DAYS = 30;
    private static final int SHORT_WINDOW_DAYS = 7;
    private static final int NOVELTY_WINDOW_DAYS = 14;
    private static final int RECENT_HINT_LIMIT = 10;
    private static final int RECOMMEND_COOLDOWN_DAYS = 3;
    private static final int RELAXED_COOLDOWN_DAYS = 1;
    private static final int SOLVED_ALL_DELTA_X10 = 5;
    private static final int SOLVED_TWO_DELTA_X10 = 3;
    private static final int SOLVED_NONE_DELTA_X10 = -1;
    private static final int FEEDBACK_TOO_EASY_DELTA_X10 = 3;
    private static final int FEEDBACK_TOO_HARD_DELTA_X10 = -3;
    private static final double DIFFICULTY_WEIGHT = 35.0;
    private static final double WEAK_WEIGHT = 12.0;
    private static final double STRONG_WEIGHT = 6.0;
    private static final double STALE_WEIGHT = 5.0;
    private static final double RECENTLY_RECOMMENDED_PENALTY = 20.0;
    private static final double OUT_OF_RANGE_PENALTY = 15.0;
    private static final double POPULARITY_WEIGHT = 2.0;
    private static final double NOVELTY_WEIGHT = 4.0;
    private static final double PRACTICALITY_WEIGHT = 6.0;
    private static final double POPULARITY_NORMALIZER = Math.log1p(1_000_000);
    private static final int MAX_LOW_FREQ_CENTERED_IN_SET = 1;
    private static final int MIN_POSITIVE_PRACTICALITY_COUNT = 2;
    private static final int MANUAL_REFRESH_DAILY_LIMIT = 2;
    private static final int DAILY_RESET_HOUR = 6;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private enum PracticalTagCategory {
        PRACTICAL_CORE,
        PRACTICAL_MID,
        MATH_BASIC,
        MATH_SPECIAL,
        SPECIAL_LOW_FREQ,
        AUXILIARY
    }

    private static final Set<String> PRACTICAL_CORE_TAGS = Set.of(
            "implementation", "bruteforcing", "backtracking", "greedy", "dp",
            "graph_traversal", "bfs", "dfs", "string", "sorting", "binary_search",
            "parametric_search", "two_pointer", "sliding_window", "prefix_sum", "simulation",
            "data_structures", "priority_queue", "parsing", "ad_hoc", "case_work",
            "coordinate_compression", "hashing", "constructive"
    );

    private static final Set<String> PRACTICAL_MID_TAGS = Set.of(
            "graphs", "trees", "shortest_path", "dijkstra", "disjoint_set",
            "mst", "topological_sorting", "dag", "bitmask", "knapsack",
            "lis", "lcs", "trie", "floyd_warshall", "0_1_bfs", "lca", "scc"
    );

    private static final Set<String> BASIC_MATH_TAGS = Set.of(
            "arithmetic", "math", "euclidean", "extended_euclidean", "prime_factorization",
            "primality_test", "sieve", "parity", "combinatorics", "probability", "statistics"
    );

    private static final Set<String> SPECIAL_MATH_TAGS = Set.of(
            "number_theory", "crt", "mobius_inversion", "discrete_log",
            "modular_multiplicative_inverse", "euler_phi", "flt", "lucas", "burnside",
            "linear_algebra", "gaussian_elimination", "calculus", "numerical_analysis",
            "physics", "pollard_rho", "miller_rabin"
    );

    private static final Set<String> SPECIAL_LOW_FREQ_TAGS = Set.of(
            "flow", "mfmc", "mcmf", "bipartite_matching", "general_matching", "hungarian",
            "fft", "suffix_array", "suffix_tree", "aho_corasick", "manacher",
            "segtree", "lazyprop", "pst", "hld", "centroid_decomposition",
            "mo", "link_cut_tree", "li_chao_tree", "geometry", "geometry_3d",
            "convex_hull", "half_plane_intersection", "voronoi", "delaunay",
            "top_tree", "beats", "matroid", "stoer_wagner", "sprague_grundy"
    );

    private static final Set<String> AUXILIARY_TAGS = Set.of(
            "queue", "stack", "deque", "set", "hash_set", "tree_set", "linked_list",
            "recursion", "traceback", "precomputation", "regex", "bitset"
    );

    @Transactional(readOnly = true)
    public RecommendationFeedbackType getFeedback(Long userId) {
        return recommendFeedbackRepository.findByUserId(userId)
                .map(RecommendFeedback::getFeedback)
                .orElse(null);
    }

    @Transactional
    public RecommendationFeedbackType upsertFeedback(Long userId, RecommendationFeedbackType feedbackType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        RecommendFeedback existing = recommendFeedbackRepository.findByUserId(userId).orElse(null);
        if (existing != null) {
            existing.updateFeedback(feedbackType);
            recommendFeedbackRepository.save(existing);
        } else {
            RecommendFeedback newFeedback = RecommendFeedback.builder()
                    .user(user)
                    .feedback(feedbackType)
                    .build();
            recommendFeedbackRepository.save(newFeedback);
        }
        return feedbackType;
    }

    @Transactional
    public List<RecommendedProblem> getOrGenerateRecommendations(Long userId) {
        return getDailyRecommendations(userId).recommendations();
    }

    @Transactional
    public DailyRecommendationResponse getDailyRecommendations(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<RecommendProblem> currentRows = loadCurrentRecommendationRows(userId);
        int manualRefreshRemaining = getManualRefreshRemaining(user);

        if (hasCompleteRecommendationSet(currentRows) && !areAllRecommendationsSolved(currentRows)) {
            log.info("추천 재사용 - userId={} refreshType=REUSED solvedCount={}", userId, countSolved(currentRows));
            return buildResponseFromRows(
                    currentRows,
                    RecommendationRefreshType.REUSED,
                    null,
                    manualRefreshRemaining
            );
        }

        RecommendationRefreshTrigger trigger = areAllRecommendationsSolved(currentRows)
                ? RecommendationRefreshTrigger.AUTO
                : RecommendationRefreshTrigger.INITIAL;
        return refreshAndBuildResponse(user, currentRows, trigger, manualRefreshRemaining);
    }

    @Transactional
    public DailyRecommendationResponse refreshRecommendationsManually(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<RecommendProblem> currentRows = loadCurrentRecommendationRows(userId);

        LocalDate policyDate = currentManualRefreshPolicyDate();
        int usedCount = resolveManualRefreshUsedCount(user, policyDate);
        if (usedCount >= MANUAL_REFRESH_DAILY_LIMIT) {
            log.info("추천 수동 새로고침 한도 초과 - userId={} policyDate={} usedCount={}", userId, policyDate, usedCount);
            return buildResponseFromRows(
                    currentRows,
                    RecommendationRefreshType.MANUAL_LIMIT_EXCEEDED,
                    "수동 새로고침은 오전 6시 기준 하루 최대 2회까지 가능합니다.",
                    0
            );
        }

        int nextUsedCount = usedCount + 1;
        user.updateManualRecRefresh(policyDate, nextUsedCount);
        int manualRefreshRemaining = Math.max(0, MANUAL_REFRESH_DAILY_LIMIT - nextUsedCount);

        log.info("추천 수동 새로고침 시작 - userId={} policyDate={} usedCount={} remaining={}", userId, policyDate, nextUsedCount, manualRefreshRemaining);
        return refreshAndBuildResponse(user, currentRows, RecommendationRefreshTrigger.MANUAL, manualRefreshRemaining);
    }

    private DailyRecommendationResponse refreshAndBuildResponse(
            User user,
            List<RecommendProblem> currentRows,
            RecommendationRefreshTrigger trigger,
            int manualRefreshRemaining
    ) {
        Long userId = user.getId();
        LocalDate today = LocalDate.now(KST);

        try {
            UserActivityRequest userActivity = fetchUserActivity(userId);
            RecommendationResponse response = callAiServer(userActivity);
            if (response == null || response.recommendations() == null || response.recommendations().isEmpty()) {
                log.warn("추천 갱신 실패(빈 응답) - userId={} trigger={}", userId, trigger);
                return buildResponseFromRows(
                        currentRows,
                        failureTypeFor(trigger),
                        failureNoticeFor(trigger, currentRows),
                        manualRefreshRemaining
                );
            }

            boolean saved = saveCurrentRecommendations(user, response.recommendations(), today);
            if (!saved) {
                log.warn("추천 갱신 실패(저장 불가) - userId={} trigger={}", userId, trigger);
                return buildResponseFromRows(
                        currentRows,
                        failureTypeFor(trigger),
                        failureNoticeFor(trigger, currentRows),
                        manualRefreshRemaining
                );
            }
            if (trigger != RecommendationRefreshTrigger.MANUAL) {
                applyPendingFeedbackIfNeeded(user, currentRows);
            } else {
                log.info("수동 새로고침은 추천 난이도 보정을 적용하지 않습니다. userId={}", userId);
            }
            List<RecommendProblem> refreshedRows = loadCurrentRecommendationRows(userId);
            if (refreshedRows.isEmpty()) {
                log.warn("추천 갱신 실패(저장 후 비어 있음) - userId={} trigger={}", userId, trigger);
                return buildResponseFromRows(
                        currentRows,
                        failureTypeFor(trigger),
                        failureNoticeFor(trigger, currentRows),
                        manualRefreshRemaining
                );
            }

            log.info(
                    "추천 갱신 성공 - userId={} trigger={} recommendationCount={} solvedCount(before)={}",
                    userId,
                    trigger,
                    refreshedRows.size(),
                    countSolved(currentRows)
            );
            return buildResponseFromRows(
                    refreshedRows,
                    successTypeFor(trigger),
                    successNoticeFor(trigger),
                    manualRefreshRemaining
            );
        } catch (Exception e) {
            log.error("추천 갱신 실패(예외) - userId={} trigger={} reason={}", userId, trigger, e.getMessage(), e);
            return buildResponseFromRows(
                    currentRows,
                    failureTypeFor(trigger),
                    failureNoticeFor(trigger, currentRows),
                    manualRefreshRemaining
            );
        }
    }

    private DailyRecommendationResponse buildResponseFromRows(
            List<RecommendProblem> rows,
            RecommendationRefreshType refreshType,
            String notice,
            int manualRefreshRemaining
    ) {
        List<RecommendedProblem> recommendations = rows.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .map(this::mapFromRecommendProblem)
                .toList();
        return new DailyRecommendationResponse(
                recommendations,
                refreshType,
                notice,
                manualRefreshRemaining
        );
    }

    private RecommendationRefreshType successTypeFor(RecommendationRefreshTrigger trigger) {
        return switch (trigger) {
            case INITIAL -> RecommendationRefreshType.INITIAL_REFRESHED;
            case AUTO -> RecommendationRefreshType.AUTO_REFRESHED;
            case MANUAL -> RecommendationRefreshType.MANUAL_REFRESHED;
        };
    }

    private RecommendationRefreshType failureTypeFor(RecommendationRefreshTrigger trigger) {
        return switch (trigger) {
            case INITIAL -> RecommendationRefreshType.INITIAL_REFRESH_FAILED;
            case AUTO -> RecommendationRefreshType.AUTO_REFRESH_FAILED;
            case MANUAL -> RecommendationRefreshType.MANUAL_REFRESH_FAILED;
        };
    }

    private String successNoticeFor(RecommendationRefreshTrigger trigger) {
        if (trigger == RecommendationRefreshTrigger.MANUAL) {
            return "추천 문제를 새로고침했어요.";
        }
        return null;
    }

    private String failureNoticeFor(RecommendationRefreshTrigger trigger, List<RecommendProblem> currentRows) {
        if (trigger == RecommendationRefreshTrigger.MANUAL || trigger == RecommendationRefreshTrigger.AUTO) {
            if (!currentRows.isEmpty()) {
                return "AI 재추천에 실패해 기존 추천 목록을 유지했어요.";
            }
        }
        if (currentRows.isEmpty()) {
            return "AI 추천 생성에 실패했어요. 잠시 후 다시 시도해주세요.";
        }
        return "AI 재추천에 실패해 기존 추천 목록을 유지했어요.";
    }

    private List<RecommendProblem> loadCurrentRecommendationRows(Long userId) {
        return recommendProblemRepository.findAllByUserIdOrderByOrderIndexAsc(userId).stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .toList();
    }

    private boolean hasCompleteRecommendationSet(List<RecommendProblem> rows) {
        return rows.size() >= TARGET_RECOMMENDATION_COUNT;
    }

    private boolean areAllRecommendationsSolved(List<RecommendProblem> rows) {
        if (!hasCompleteRecommendationSet(rows)) {
            return false;
        }
        return rows.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .allMatch(row -> Boolean.TRUE.equals(row.getSolved()));
    }

    private long countSolved(List<RecommendProblem> rows) {
        return rows.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .filter(row -> Boolean.TRUE.equals(row.getSolved()))
                .count();
    }

    private int getManualRefreshRemaining(User user) {
        LocalDate policyDate = currentManualRefreshPolicyDate();
        int usedCount = resolveManualRefreshUsedCount(user, policyDate);
        return Math.max(0, MANUAL_REFRESH_DAILY_LIMIT - usedCount);
    }

    private int resolveManualRefreshUsedCount(User user, LocalDate policyDate) {
        if (user.getManualRecRefreshDate() == null || !policyDate.equals(user.getManualRecRefreshDate())) {
            return 0;
        }
        Integer count = user.getManualRecRefreshCount();
        return count == null ? 0 : Math.max(0, count);
    }

    private LocalDate currentManualRefreshPolicyDate() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        LocalDate policyDate = now.toLocalDate();
        if (now.getHour() < DAILY_RESET_HOUR) {
            return policyDate.minusDays(1);
        }
        return policyDate;
    }

    private RecommendationResponse callAiServer(UserActivityRequest request) {
        List<CandidateProblemDto> candidates = request.candidateProblems() == null
                ? List.of()
                : request.candidateProblems();
        if (candidates.isEmpty()) {
            return new RecommendationResponse(List.of());
        }

        Map<String, CandidateProblemDto> candidateMap = candidates.stream()
                .filter(candidate -> candidate.problemId() != null && !candidate.problemId().isBlank())
                .collect(Collectors.toMap(CandidateProblemDto::problemId, Function.identity(), (left, right) -> left));

        List<AiApiResponse.AiRecommendedProblem> aiRecommendations = List.of();
        try {
            AiApiResponse aiResponse = aiRestClient.post()
                    .uri("/recommend/intelligent")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AiApiResponse.class);
            if (aiResponse != null && aiResponse.recommendations() != null) {
                aiRecommendations = aiResponse.recommendations();
            }
        } catch (Exception e) {
            log.warn("AI 서버 응답 실패로 추천 갱신을 중단합니다. reason={}", e.getMessage());
            return new RecommendationResponse(List.of());
        }

        List<CandidateProblemDto> rankedCandidates = candidates.stream()
                .sorted(Comparator.comparing(
                        (CandidateProblemDto candidate) -> candidate.candidateScore() == null ? 0.0 : candidate.candidateScore()
                ).reversed())
                .toList();

        List<SelectedRecommendation> selected = new ArrayList<>();
        Set<String> selectedIds = new HashSet<>();
        Map<String, Integer> coreTagCounts = new HashMap<>();
        int stretchCount = 0;
        int hardCount = 0;
        int lowFreqCenteredCount = 0;
        int positivePracticalityCount = 0;

        for (AiApiResponse.AiRecommendedProblem aiProblem : aiRecommendations) {
            if (selected.size() >= TARGET_RECOMMENDATION_COUNT) {
                break;
            }
            String problemId = aiProblem.problemId() != null ? aiProblem.problemId().trim() : "";
            if (problemId.isBlank() || selectedIds.contains(problemId)) {
                continue;
            }
            CandidateProblemDto candidate = candidateMap.get(problemId);
            if (candidate == null) {
                continue;
            }

            if (!canAddCandidate(candidate, coreTagCounts, stretchCount, hardCount, lowFreqCenteredCount)) {
                continue;
            }

            String intent = normalizeIntent(aiProblem.intent(), candidate.selectionIntentHint());
            String reason = normalizeReason(aiProblem.reason(), candidate, intent);
            selected.add(new SelectedRecommendation(problemId, reason, intent, "LLM"));
            selectedIds.add(problemId);
            stretchCount += "STRETCH".equals(intent) ? 1 : 0;
            hardCount += (candidate.difficultyGap() != null && candidate.difficultyGap() >= 2) ? 1 : 0;
            lowFreqCenteredCount += isLowFreqCentered(candidate.tags()) ? 1 : 0;
            positivePracticalityCount += calculatePracticalityScore(candidate.tags()) > 0 ? 1 : 0;
            incrementCoreTagCount(coreTagCounts, candidate);
        }

        for (CandidateProblemDto candidate : rankedCandidates) {
            if (selected.size() >= TARGET_RECOMMENDATION_COUNT) {
                break;
            }
            String problemId = candidate.problemId();
            if (problemId == null || problemId.isBlank() || selectedIds.contains(problemId)) {
                continue;
            }
            if (!canAddCandidate(candidate, coreTagCounts, stretchCount, hardCount, lowFreqCenteredCount)) {
                continue;
            }
            String intent = normalizeIntent(null, candidate.selectionIntentHint());
            String reason = buildFallbackReason(candidate, intent);
            selected.add(new SelectedRecommendation(problemId, reason, intent, "FALLBACK"));
            selectedIds.add(problemId);
            stretchCount += "STRETCH".equals(intent) ? 1 : 0;
            hardCount += (candidate.difficultyGap() != null && candidate.difficultyGap() >= 2) ? 1 : 0;
            lowFreqCenteredCount += isLowFreqCentered(candidate.tags()) ? 1 : 0;
            positivePracticalityCount += calculatePracticalityScore(candidate.tags()) > 0 ? 1 : 0;
            incrementCoreTagCount(coreTagCounts, candidate);
        }

        ensureWeaknessRepair(selected, selectedIds, candidateMap, rankedCandidates);
        if (selected.size() < TARGET_RECOMMENDATION_COUNT) {
            for (CandidateProblemDto candidate : rankedCandidates) {
                if (selected.size() >= TARGET_RECOMMENDATION_COUNT) {
                    break;
                }
                String problemId = candidate.problemId();
                if (problemId == null || problemId.isBlank() || selectedIds.contains(problemId)) {
                    continue;
                }
                String intent = normalizeIntent(null, candidate.selectionIntentHint());
                selected.add(new SelectedRecommendation(problemId, buildFallbackReason(candidate, intent), intent, "FALLBACK"));
                selectedIds.add(problemId);
                lowFreqCenteredCount += isLowFreqCentered(candidate.tags()) ? 1 : 0;
                positivePracticalityCount += calculatePracticalityScore(candidate.tags()) > 0 ? 1 : 0;
            }
        }

        enforcePracticalityMinimum(selected, selectedIds, rankedCandidates, candidateMap, positivePracticalityCount);

        List<SelectedRecommendation> finalSelected = selected.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .toList();

        List<RecommendedProblem> mapped = finalSelected.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .map(selectedRecommendation -> {
                    CandidateProblemDto candidate = candidateMap.get(selectedRecommendation.problemId());
                    if (candidate == null) {
                        return null;
                    }
                    return mapCandidateToRecommendedProblem(candidate, selectedRecommendation.reason());
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        return new RecommendationResponse(mapped);
    }

    private enum RecommendationRefreshTrigger {
        INITIAL,
        AUTO,
        MANUAL
    }

    private void applyPendingFeedbackIfNeeded(User user, List<RecommendProblem> currentRows) {
        Long userId = user.getId();
        if (currentRows == null || currentRows.isEmpty()) {
            return;
        }

        long solvedCount = currentRows.stream()
                .filter(row -> Boolean.TRUE.equals(row.getSolved()))
                .count();
        int solveDeltaX10;
        if (solvedCount >= 3) {
            solveDeltaX10 = SOLVED_ALL_DELTA_X10;
        } else if (solvedCount == 2) {
            solveDeltaX10 = SOLVED_TWO_DELTA_X10;
        } else if (solvedCount == 0) {
            solveDeltaX10 = SOLVED_NONE_DELTA_X10;
        } else {
            solveDeltaX10 = 0;
        }

        List<RecommendFeedback> feedbacks = recommendFeedbackRepository.findAllByUserId(userId);
        int feedbackDeltaX10 = feedbacks.stream()
                .map(RecommendFeedback::getFeedback)
                .mapToInt(this::toDeltaX10)
                .sum();
        int totalDeltaX10 = solveDeltaX10 + feedbackDeltaX10;

        if (totalDeltaX10 != 0) {
            int nextLevel = sanitizeRecLevelX10(user.getRecLevelX10() + totalDeltaX10);
            user.updateRecLevelX10(nextLevel);
            log.info(
                    "추천 난이도 보정 적용 userId={} solvedCount={} solveDeltaX10={} feedbackDeltaX10={} totalDeltaX10={} nextRecLevelX10={}",
                    userId, solvedCount, solveDeltaX10, feedbackDeltaX10, totalDeltaX10, nextLevel
            );
        }

        recommendFeedbackRepository.deleteAllByUserId(userId);
    }

    private boolean canAddCandidate(
            CandidateProblemDto candidate,
            Map<String, Integer> coreTagCounts,
            int stretchCount,
            int hardCount,
            int lowFreqCenteredCount
    ) {
        String intent = normalizeIntent(candidate.selectionIntentHint(), candidate.selectionIntentHint());
        if ("STRETCH".equals(intent) && stretchCount >= 1) {
            return false;
        }
        if (candidate.difficultyGap() != null && candidate.difficultyGap() >= 2 && hardCount >= 1) {
            return false;
        }
        if (isLowFreqCentered(candidate.tags()) && lowFreqCenteredCount >= MAX_LOW_FREQ_CENTERED_IN_SET) {
            return false;
        }
        String coreTag = extractCoreTag(candidate);
        if (coreTag != null && coreTagCounts.getOrDefault(coreTag, 0) >= 2) {
            return false;
        }
        return true;
    }

    private void incrementCoreTagCount(Map<String, Integer> coreTagCounts, CandidateProblemDto candidate) {
        String coreTag = extractCoreTag(candidate);
        if (coreTag == null) {
            return;
        }
        coreTagCounts.put(coreTag, coreTagCounts.getOrDefault(coreTag, 0) + 1);
    }

    private String extractCoreTag(CandidateProblemDto candidate) {
        if (candidate.tags() == null || candidate.tags().isEmpty()) {
            return null;
        }
        String first = candidate.tags().get(0);
        if (first == null || first.isBlank()) {
            return null;
        }
        return first.trim();
    }

    private String normalizeIntent(String aiIntent, String fallbackIntent) {
        String intent = aiIntent != null ? aiIntent.trim().toUpperCase() : "";
        if (!Set.of("WEAKNESS_REPAIR", "STABLE_FIT", "STRETCH", "REVIEW").contains(intent)) {
            intent = fallbackIntent != null ? fallbackIntent.trim().toUpperCase() : "STABLE_FIT";
        }
        if (!Set.of("WEAKNESS_REPAIR", "STABLE_FIT", "STRETCH", "REVIEW").contains(intent)) {
            return "STABLE_FIT";
        }
        return intent;
    }

    private String normalizeReason(String reason, CandidateProblemDto candidate, String intent) {
        if (reason == null || reason.isBlank()) {
            return buildFallbackReason(candidate, intent);
        }
        return reason.trim();
    }

    private void ensureWeaknessRepair(
            List<SelectedRecommendation> selected,
            Set<String> selectedIds,
            Map<String, CandidateProblemDto> candidateMap,
            List<CandidateProblemDto> rankedCandidates
    ) {
        boolean hasWeakness = selected.stream()
                .anyMatch(item -> "WEAKNESS_REPAIR".equals(normalizeIntent(item.intent(), item.intent())));
        if (hasWeakness) {
            return;
        }

        CandidateProblemDto weaknessCandidate = rankedCandidates.stream()
                .filter(candidate -> candidate.problemId() != null && !selectedIds.contains(candidate.problemId()))
                .filter(candidate -> "WEAKNESS_REPAIR".equals(normalizeIntent(candidate.selectionIntentHint(), candidate.selectionIntentHint())))
                .findFirst()
                .orElse(null);

        if (weaknessCandidate == null) {
            return;
        }

        SelectedRecommendation weaknessRecommendation = new SelectedRecommendation(
                weaknessCandidate.problemId(),
                buildFallbackReason(weaknessCandidate, "WEAKNESS_REPAIR"),
                "WEAKNESS_REPAIR",
                "RULE_BASED"
        );

        if (selected.size() < TARGET_RECOMMENDATION_COUNT) {
            selected.add(weaknessRecommendation);
            selectedIds.add(weaknessCandidate.problemId());
            return;
        }

        int replaceIndex = -1;
        for (int i = selected.size() - 1; i >= 0; i--) {
            SelectedRecommendation item = selected.get(i);
            if (!"WEAKNESS_REPAIR".equals(normalizeIntent(item.intent(), item.intent()))) {
                replaceIndex = i;
                break;
            }
        }
        if (replaceIndex >= 0) {
            String removedId = selected.get(replaceIndex).problemId();
            selected.set(replaceIndex, weaknessRecommendation);
            selectedIds.remove(removedId);
            selectedIds.add(weaknessCandidate.problemId());
        }
    }

    private void enforcePracticalityMinimum(
            List<SelectedRecommendation> selected,
            Set<String> selectedIds,
            List<CandidateProblemDto> rankedCandidates,
            Map<String, CandidateProblemDto> candidateMap,
            int currentPositiveCount
    ) {
        if (selected.isEmpty() || currentPositiveCount >= MIN_POSITIVE_PRACTICALITY_COUNT) {
            return;
        }

        int positiveCount = currentPositiveCount;
        for (CandidateProblemDto replacementCandidate : rankedCandidates) {
            if (positiveCount >= MIN_POSITIVE_PRACTICALITY_COUNT) {
                break;
            }
            if (replacementCandidate.problemId() == null || selectedIds.contains(replacementCandidate.problemId())) {
                continue;
            }
            if (calculatePracticalityScore(replacementCandidate.tags()) <= 0) {
                continue;
            }

            int replaceIndex = findReplaceableNonPracticalIndex(selected, candidateMap);
            if (replaceIndex < 0) {
                break;
            }

            SelectedRecommendation old = selected.get(replaceIndex);
            selected.set(
                    replaceIndex,
                    new SelectedRecommendation(
                            replacementCandidate.problemId(),
                            buildFallbackReason(replacementCandidate, replacementCandidate.selectionIntentHint()),
                            normalizeIntent(replacementCandidate.selectionIntentHint(), "STABLE_FIT"),
                            "RULE_BASED"
                    )
            );
            selectedIds.remove(old.problemId());
            selectedIds.add(replacementCandidate.problemId());
            positiveCount++;
        }
    }

    private int findReplaceableNonPracticalIndex(
            List<SelectedRecommendation> selected,
            Map<String, CandidateProblemDto> candidateMap
    ) {
        for (int i = selected.size() - 1; i >= 0; i--) {
            CandidateProblemDto candidate = candidateMap.get(selected.get(i).problemId());
            if (candidate == null) {
                continue;
            }
            if (calculatePracticalityScore(candidate.tags()) <= 0) {
                return i;
            }
        }
        return -1;
    }

    private int toDeltaX10(RecommendationFeedbackType feedbackType) {
        if (feedbackType == null) {
            return 0;
        }
        return switch (feedbackType) {
            case TOO_EASY -> FEEDBACK_TOO_EASY_DELTA_X10;
            case TOO_HARD -> FEEDBACK_TOO_HARD_DELTA_X10;
            case JUST_RIGHT -> 0;
        };
    }

    private boolean saveCurrentRecommendations(User user, List<RecommendedProblem> recommendations, LocalDate today) {
        Long userId = user.getId();
        List<RecommendedProblem> limitedRecommendations = recommendations.stream()
                .limit(TARGET_RECOMMENDATION_COUNT)
                .toList();

        List<String> externalIds = limitedRecommendations.stream()
                .map(RecommendedProblem::id)
                .filter(id -> id != null && !id.isBlank())
                .toList();

        Map<String, Problem> problemMap = problemRepository
                .findBySourceAndLanguageAndExternalIdInWithTags("BOJ", "ko", externalIds)
                .stream()
                .collect(Collectors.toMap(Problem::getExternalId, Function.identity(), (left, right) -> left));

        List<RecommendProblem> existingRows = recommendProblemRepository.findAllByUserIdOrderByOrderIndexAsc(userId);
        Map<Integer, RecommendProblem> existingByOrder = existingRows.stream()
                .filter(row -> row.getOrderIndex() != null)
                .collect(Collectors.toMap(RecommendProblem::getOrderIndex, Function.identity(), (left, right) -> left));

        List<RecommendProblem> upsertRows = new ArrayList<>();
        Set<Integer> usedOrders = new HashSet<>();

        for (int index = 0; index < limitedRecommendations.size(); index++) {
            RecommendedProblem rec = limitedRecommendations.get(index);
            Problem problem = problemMap.get(rec.id());
            if (problem == null) {
                continue;
            }

            RecommendProblem row = existingByOrder.get(index);
            if (row == null) {
                row = RecommendProblem.create(user, problem, rec.reason(), index);
            } else {
                row.updateRecommendation(problem, rec.reason(), index);
            }

            upsertRows.add(row);
            usedOrders.add(index);
        }

        if (upsertRows.isEmpty()) {
            log.warn("저장 가능한 추천 문제가 없어 기존 목록을 유지합니다. userId={} requestedCount={}", userId, limitedRecommendations.size());
            return false;
        }

        List<RecommendProblem> toDelete = existingRows.stream()
                .filter(row -> row.getOrderIndex() == null || !usedOrders.contains(row.getOrderIndex()))
                .toList();
        if (!toDelete.isEmpty()) {
            recommendProblemRepository.deleteAll(toDelete);
        }

        if (!upsertRows.isEmpty()) {
            user.updateLastRecommendedDate(today);
            recommendProblemRepository.saveAll(upsertRows);
        }

        return true;
    }

    private RecommendedProblem mapFromRecommendProblem(RecommendProblem recommendProblem) {
        Problem problem = recommendProblem.getProblem();
        String tier = problem.getTier();
        String[] parts = tier != null ? tier.split(" ") : new String[0];
        String tierType = parts.length >= 1 ? parts[0].toLowerCase() : "bronze";
        Integer tierLevel = 5;
        if (parts.length >= 2) {
            try {
                tierLevel = Integer.parseInt(parts[1]);
            } catch (NumberFormatException e) {
                tierLevel = parseRoman(parts[1]);
            }
        }

        List<String> tags = problem.getTags().stream()
                .map(Tag::getName)
                .filter(name -> name != null && !name.isBlank())
                .toList();

        return new RecommendedProblem(
                problem.getExternalId(),
                problem.getTitle(),
                tierType,
                tierLevel,
                tags,
                recommendProblem.getReason() != null ? recommendProblem.getReason() : "추천 문제입니다.",
                Boolean.TRUE.equals(recommendProblem.getSolved())
        );
    }

    private RecommendedProblem mapCandidateToRecommendedProblem(CandidateProblemDto candidate, String reason) {
        String fullTier = candidate.tier() != null ? candidate.tier() : "Bronze 5";
        String[] parts = fullTier.split(" ");
        String tierType = "bronze";
        Integer tierLevel = 5;

        if (parts.length >= 1) {
            tierType = parts[0].toLowerCase();
        }
        if (parts.length >= 2) {
            try {
                tierLevel = Integer.parseInt(parts[1]);
            } catch (NumberFormatException e) {
                tierLevel = parseRoman(parts[1]);
            }
        }

        return new RecommendedProblem(
                candidate.problemId(),
                candidate.title(),
                tierType,
                tierLevel,
                candidate.tags() == null ? List.of() : candidate.tags(),
                reason != null && !reason.isBlank() ? reason : buildFallbackReason(candidate, candidate.selectionIntentHint()),
                false
        );
    }

    private Integer parseRoman(String roman) {
        return switch (roman.toUpperCase()) {
            case "I" -> 1;
            case "II" -> 2;
            case "III" -> 3;
            case "IV" -> 4;
            case "V" -> 5;
            default -> 5;
        };
    }


    private UserActivityRequest fetchUserActivity(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDateTime now = LocalDateTime.now(KST);
        LocalDateTime longWindowStart = now.minusDays(LONG_WINDOW_DAYS);
        LocalDateTime shortWindowStart = now.minusDays(SHORT_WINDOW_DAYS);
        LocalDateTime noveltyWindowStart = now.minusDays(NOVELTY_WINDOW_DAYS);

        List<SubmissionLog> longWindowLogs = logRepository
                .findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(userId, longWindowStart, now);

        List<SubmissionLog> shortWindowLogs = longWindowLogs.stream()
                .filter(log -> log.getSubmittedAt() != null && !log.getSubmittedAt().isBefore(shortWindowStart))
                .toList();

        List<SubmissionLog> noveltyWindowLogs = longWindowLogs.stream()
                .filter(log -> log.getSubmittedAt() != null && !log.getSubmittedAt().isBefore(noveltyWindowStart))
                .toList();

        List<String> solvedTitles = shortWindowLogs.stream()
                .filter(log -> Boolean.TRUE.equals(log.getIsSuccess()))
                .map(SubmissionLog::getProblemTitle)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .limit(RECENT_HINT_LIMIT)
                .toList();

        List<String> failedTitles = shortWindowLogs.stream()
                .filter(log -> Boolean.FALSE.equals(log.getIsSuccess()))
                .map(SubmissionLog::getProblemTitle)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .limit(RECENT_HINT_LIMIT)
                .toList();

        Map<String, int[]> tagStatsMap = new HashMap<>();
        for (SubmissionLog log : longWindowLogs) {
            Set<Tag> tags = log.getProblem() != null ? log.getProblem().getTags() : Set.of();
            for (Tag tag : tags) {
                String tagKey = extractTagKey(tag);
                if (tagKey == null) {
                    continue;
                }
                int[] stat = tagStatsMap.computeIfAbsent(tagKey, key -> new int[2]);
                stat[0] += 1;
                if (Boolean.TRUE.equals(log.getIsSuccess())) {
                    stat[1] += 1;
                }
            }
        }

        List<TagStatDto> tagStatDtos = tagStatsMap.entrySet().stream()
                .map(entry -> {
                    String tagName = entry.getKey();
                    int totalCount = entry.getValue()[0];
                    int successCount = entry.getValue()[1];
                    double accuracyRate = totalCount > 0 ? (double) successCount / totalCount : 0.0;
                    return new TagStatDto(tagName, accuracyRate, totalCount);
                })
                .toList();

        Set<String> strongTags = tagStatDtos.stream()
                .filter(stat -> stat.attemptCount() >= 3)
                .filter(stat -> stat.accuracyRate() >= 0.7)
                .map(TagStatDto::tagName)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        Set<String> weakTags = tagStatDtos.stream()
                .filter(stat -> stat.attemptCount() >= 3)
                .filter(stat -> stat.accuracyRate() < 0.4)
                .map(TagStatDto::tagName)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        Set<String> solvedRecent30Tags = longWindowLogs.stream()
                .filter(log -> Boolean.TRUE.equals(log.getIsSuccess()))
                .flatMap(log -> (log.getProblem() == null ? Set.<Tag>of() : log.getProblem().getTags()).stream())
                .map(this::extractTagKey)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        Set<String> solvedBefore30Tags = logRepository.findDistinctSolvedTagKeysBefore(userId, longWindowStart)
                .stream()
                .filter(tag -> tag != null && !tag.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        Set<String> staleTags = new java.util.LinkedHashSet<>(solvedBefore30Tags);
        staleTags.removeAll(solvedRecent30Tags);

        Set<String> recentInteractionTags = noveltyWindowLogs.stream()
                .flatMap(log -> (log.getProblem() == null ? Set.<Tag>of() : log.getProblem().getTags()).stream())
                .map(this::extractTagKey)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        int recLevelX10 = sanitizeRecLevelX10(user.getRecLevelX10());
        int recLevel = Math.max(1, Math.min(30, recLevelX10 / 10));
        String currentTier = SolvedAcLevelUtil.convertLevelToTier(recLevel);
        int targetLevel = recLevelX10 / 10;
        int attemptSignal = longWindowLogs.size();
        boolean isColdStart = attemptSignal < 5;
        List<CandidateProblemDto> candidateProblems = fetchCandidateProblems(
                userId,
                recLevel,
                targetLevel,
                strongTags,
                weakTags,
                staleTags,
                recentInteractionTags,
                isColdStart,
                LocalDate.now(KST)
        );
        String tone = isColdStart ? "시작용/적응용" : "성장/보완";

        return new UserActivityRequest(
                solvedTitles,
                failedTitles,
                tagStatDtos,
                currentTier,
                recLevelX10,
                tone,
                List.copyOf(strongTags),
                List.copyOf(weakTags),
                List.copyOf(staleTags),
                candidateProblems
        );

    }

    private List<CandidateProblemDto> fetchCandidateProblems(
            Long userId,
            int baseLevel,
            int targetLevel,
            Set<String> strongTags,
            Set<String> weakTags,
            Set<String> staleTags,
            Set<String> recentInteractionTags,
            boolean isColdStart,
            LocalDate today
    ) {
        int minLevel = Math.max(1, baseLevel - 2);
        int maxLevel = Math.min(30, baseLevel + 2);

        List<String> externalIds = problemRepository
                .findRecommendationCandidateExternalIds(userId, minLevel, maxLevel, PageRequest.of(0, CANDIDATE_POOL_SIZE))
                .getContent();

        if (externalIds.isEmpty()) {
            return List.of();
        }

        Map<String, Problem> problemMap = problemRepository
                .findBySourceAndLanguageAndExternalIdInWithTags("BOJ", "ko", externalIds)
                .stream()
                .collect(Collectors.toMap(Problem::getExternalId, Function.identity(), (left, right) -> left));

        Set<String> recentlyRecommendedIds = recommendProblemRepository.findAllByUserIdOrderByOrderIndexAsc(userId)
                .stream()
                .map(recommendProblem -> recommendProblem.getProblem() != null ? recommendProblem.getProblem().getExternalId() : null)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Set<String> strictCooldownIds = fetchRecentRecommendedProblemIds(userId, today, RECOMMEND_COOLDOWN_DAYS);
        List<String> candidateExternalIds = externalIds.stream()
                .filter(externalId -> !strictCooldownIds.contains(externalId))
                .toList();

        if (candidateExternalIds.size() < AI_CANDIDATE_LIMIT) {
            Set<String> relaxedCooldownIds = fetchRecentRecommendedProblemIds(userId, today, RELAXED_COOLDOWN_DAYS);
            candidateExternalIds = externalIds.stream()
                    .filter(externalId -> !relaxedCooldownIds.contains(externalId))
                    .toList();
        }

        if (candidateExternalIds.size() < AI_CANDIDATE_LIMIT / 2) {
            candidateExternalIds = externalIds;
        }

        return candidateExternalIds.stream()
                .map(problemMap::get)
                .filter(java.util.Objects::nonNull)
                .map(problem -> {
                    List<String> tags = problem.getTags().stream()
                            .map(this::extractTagKey)
                            .filter(java.util.Objects::nonNull)
                            .distinct()
                            .toList();
                    if (isColdStart && containsSpecialLowFreq(tags)) {
                        return null;
                    }
                    int difficultyGap = (problem.getLevel() == null ? 0 : problem.getLevel()) - targetLevel;
                    int weakTagMatchCount = (int) tags.stream().filter(weakTags::contains).count();
                    int strongTagMatchCount = (int) tags.stream().filter(strongTags::contains).count();
                    int staleTagMatchCount = (int) tags.stream().filter(staleTags::contains).count();
                    boolean recentlyRecommended = recentlyRecommendedIds.contains(problem.getExternalId());
                    double popularityScore = normalizePopularity(problem.getAcceptedUserCount());
                    double noveltyScore = calculateNoveltyScore(tags, recentInteractionTags);
                    double practicalityScore = calculatePracticalityScore(tags);
                    String selectionIntentHint = decideSelectionIntentHint(
                            weakTagMatchCount,
                            strongTagMatchCount,
                            staleTagMatchCount,
                            difficultyGap
                    );
                    double candidateScore = scoreCandidate(
                            difficultyGap,
                            weakTagMatchCount,
                            strongTagMatchCount,
                            staleTagMatchCount,
                            recentlyRecommended,
                            popularityScore,
                            noveltyScore,
                            practicalityScore
                    );
                    return new CandidateProblemDto(
                            problem.getExternalId(),
                            problem.getTitle(),
                            problem.getTier(),
                            problem.getLevel(),
                            tags,
                            difficultyGap,
                            weakTagMatchCount,
                            strongTagMatchCount,
                            staleTagMatchCount,
                            recentlyRecommended,
                            candidateScore,
                            selectionIntentHint,
                            popularityScore,
                            noveltyScore
                    );
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(
                        (CandidateProblemDto candidate) -> candidate.candidateScore() == null ? 0.0 : candidate.candidateScore()
                ).reversed())
                .limit(AI_CANDIDATE_LIMIT)
                .toList();
    }

    private String extractTagKey(Tag tag) {
        if (tag == null) {
            return null;
        }
        if (tag.getKey() != null && !tag.getKey().isBlank()) {
            return tag.getKey().trim();
        }
        if (tag.getName() != null && !tag.getName().isBlank()) {
            return tag.getName().trim();
        }
        return null;
    }

    private double scoreCandidate(
            int difficultyGap,
            int weakTagMatchCount,
            int strongTagMatchCount,
            int staleTagMatchCount,
            boolean recentlyRecommended,
            double popularityScore,
            double noveltyScore,
            double practicalityScore
    ) {
        double score = 0.0;
        score += difficultyFitScore(difficultyGap) * DIFFICULTY_WEIGHT;
        score += weakTagMatchCount * WEAK_WEIGHT;
        score += strongTagMatchCount * STRONG_WEIGHT;
        score += staleTagMatchCount * STALE_WEIGHT;
        if (recentlyRecommended) {
            score -= RECENTLY_RECOMMENDED_PENALTY;
        }
        if (difficultyGap <= -3 || difficultyGap >= 3) {
            score -= OUT_OF_RANGE_PENALTY;
        }
        score += popularityScore * POPULARITY_WEIGHT;
        score += noveltyScore * NOVELTY_WEIGHT;
        score += practicalityScore * PRACTICALITY_WEIGHT;
        return score;
    }

    private double difficultyFitScore(int difficultyGap) {
        return switch (difficultyGap) {
            case 0 -> 1.0;
            case -1, 1 -> 0.85;
            case -2, 2 -> 0.65;
            default -> 0.2;
        };
    }

    private String decideSelectionIntentHint(
            int weakTagMatchCount,
            int strongTagMatchCount,
            int staleTagMatchCount,
            int difficultyGap
    ) {
        if (weakTagMatchCount > 0) {
            return "WEAKNESS_REPAIR";
        }
        if (strongTagMatchCount > 0 && difficultyGap >= 1) {
            return "STRETCH";
        }
        if (staleTagMatchCount > 0) {
            return "REVIEW";
        }
        return "STABLE_FIT";
    }

    private double normalizePopularity(Integer acceptedUserCount) {
        int safeCount = acceptedUserCount == null ? 0 : Math.max(0, acceptedUserCount);
        return Math.log1p(safeCount) / POPULARITY_NORMALIZER;
    }

    private Set<String> fetchRecentRecommendedProblemIds(Long userId, LocalDate today, int cooldownDays) {
        return Set.of();
    }

    private PracticalTagCategory categoryOf(String rawTag) {
        if (rawTag == null || rawTag.isBlank()) {
            return PracticalTagCategory.AUXILIARY;
        }
        String tag = rawTag.trim().toLowerCase();
        if (PRACTICAL_CORE_TAGS.contains(tag)) {
            return PracticalTagCategory.PRACTICAL_CORE;
        }
        if (PRACTICAL_MID_TAGS.contains(tag)) {
            return PracticalTagCategory.PRACTICAL_MID;
        }
        if (BASIC_MATH_TAGS.contains(tag)) {
            return PracticalTagCategory.MATH_BASIC;
        }
        if (SPECIAL_MATH_TAGS.contains(tag)) {
            return PracticalTagCategory.MATH_SPECIAL;
        }
        if (SPECIAL_LOW_FREQ_TAGS.contains(tag)) {
            return PracticalTagCategory.SPECIAL_LOW_FREQ;
        }
        if (AUXILIARY_TAGS.contains(tag)) {
            return PracticalTagCategory.AUXILIARY;
        }
        return PracticalTagCategory.AUXILIARY;
    }

    private boolean containsSpecialLowFreq(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return false;
        }
        return tags.stream().anyMatch(tag -> categoryOf(tag) == PracticalTagCategory.SPECIAL_LOW_FREQ);
    }

    private boolean isLowFreqCentered(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return false;
        }
        long coreCount = tags.stream().filter(tag -> categoryOf(tag) == PracticalTagCategory.PRACTICAL_CORE).count();
        long midCount = tags.stream().filter(tag -> categoryOf(tag) == PracticalTagCategory.PRACTICAL_MID).count();
        long specialMathCount = tags.stream().filter(tag -> categoryOf(tag) == PracticalTagCategory.MATH_SPECIAL).count();
        long specialLowFreqCount = tags.stream().filter(tag -> categoryOf(tag) == PracticalTagCategory.SPECIAL_LOW_FREQ).count();
        long specialCount = specialMathCount + specialLowFreqCount;
        return specialCount > 0 && specialCount >= (coreCount + midCount);
    }

    private double calculatePracticalityScore(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return 0.0;
        }

        double score = 0.0;
        boolean hasCore = false;
        boolean hasSpecialMath = false;
        boolean hasSpecialLowFreq = false;
        int basicMathCount = 0;

        for (String tag : tags) {
            PracticalTagCategory category = categoryOf(tag);
            switch (category) {
                case PRACTICAL_CORE -> {
                    score += 1.0;
                    hasCore = true;
                }
                case PRACTICAL_MID -> score += 0.45;
                case MATH_BASIC -> {
                    score -= 0.10;
                    basicMathCount++;
                }
                case MATH_SPECIAL -> {
                    score -= 0.90;
                    hasSpecialMath = true;
                }
                case SPECIAL_LOW_FREQ -> {
                    score -= 1.00;
                    hasSpecialLowFreq = true;
                }
                case AUXILIARY -> score += 0.05;
            }
        }

        if (hasCore) {
            score += basicMathCount * 0.15;
        }
        if (hasSpecialMath && hasSpecialLowFreq) {
            score -= 0.8;
        }
        if (!hasCore && (hasSpecialMath || hasSpecialLowFreq)) {
            score -= 0.6;
        }
        return score;
    }

    private double calculateNoveltyScore(List<String> candidateTags, Set<String> recentInteractionTags) {
        if (candidateTags == null || candidateTags.isEmpty()) {
            return 0.5;
        }
        if (recentInteractionTags == null || recentInteractionTags.isEmpty()) {
            return 1.0;
        }
        long overlap = candidateTags.stream().filter(recentInteractionTags::contains).count();
        double overlapRatio = (double) overlap / (double) candidateTags.size();
        return Math.max(0.0, 1.0 - overlapRatio);
    }

    private String buildFallbackReason(CandidateProblemDto candidate, String intent) {
        String normalizedIntent = normalizeIntent(intent, candidate.selectionIntentHint());
        return switch (normalizedIntent) {
            case "WEAKNESS_REPAIR" -> "최근 약한 유형을 보완하는 데 적절한 문제예요.";
            case "STRETCH" -> "익숙한 유형을 한 단계 높은 난이도로 확장해 보기 좋은 문제예요.";
            case "REVIEW" -> "한동안 손이 닿지 않았던 유형 감각을 다시 살리기 좋은 문제예요.";
            default -> "현재 추천 난이도에 맞춰 안정적으로 풀기 좋은 문제예요.";
        };
    }

    private record SelectedRecommendation(
            String problemId,
            String reason,
            String intent,
            String selectedBy
    ) {
    }

    private int sanitizeRecLevelX10(Integer recLevelX10) {
        if (recLevelX10 == null) {
            return MIN_REC_LEVEL_X10;
        }
        return Math.max(MIN_REC_LEVEL_X10, Math.min(MAX_REC_LEVEL_X10, recLevelX10));
    }

}
