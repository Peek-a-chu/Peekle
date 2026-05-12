package com.peekle.domain.leetcode.service;

import com.peekle.domain.ai.repository.RecommendProblemRepository;
import com.peekle.domain.leetcode.dto.request.LeetcodeTranslationRequest;
import com.peekle.domain.leetcode.entity.LeetcodeProblemRating;
import com.peekle.domain.leetcode.repository.LeetcodeProblemRatingRepository;
import com.peekle.domain.league.dto.UserLeagueStatusDto;
import com.peekle.domain.league.service.LeagueService;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.entity.TagMapping;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.problem.repository.TagMappingRepository;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.domain.submission.dto.LeetcodeSubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.enums.SourceType;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeetcodeSubmissionService {

    private static final String LEETCODE_SOURCE = "LEETCODE";
    private static final String DIFFICULTY_SOURCE_ZEROTRAC = "ZEROTRAC";
    private static final String DIFFICULTY_SOURCE_LEETCODE_OFFICIAL = "LEETCODE_OFFICIAL";
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private static final Map<String, String> LEETCODE_TO_INTERNAL_TAG_KEY = Map.ofEntries(
            Map.entry("math", "math"),
            Map.entry("string", "string"),
            Map.entry("dynamic-programming", "dp"),
            Map.entry("depth-first-search", "dfs"),
            Map.entry("breadth-first-search", "bfs"),
            Map.entry("binary-search", "binary_search"),
            Map.entry("two-pointers", "two_pointer"),
            Map.entry("sorting", "sorting"),
            Map.entry("greedy", "greedy"),
            Map.entry("backtracking", "backtracking"),
            Map.entry("recursion", "recursion"),
            Map.entry("stack", "stack"),
            Map.entry("queue", "queue"),
            Map.entry("heap-priority-queue", "priority_queue"),
            Map.entry("trie", "trie"),
            Map.entry("bit-manipulation", "bitmask"),
            Map.entry("graph", "graphs"),
            Map.entry("simulation", "simulation"),
            Map.entry("prefix-sum", "prefix_sum"),
            Map.entry("sliding-window", "sliding_window"),
            Map.entry("divide-and-conquer", "divide_and_conquer"),
            Map.entry("shortest-path", "shortest_path"),
            Map.entry("union-find", "disjoint_set"),
            Map.entry("linked-list", "linked_list"),
            Map.entry("number-theory", "number_theory"),
            Map.entry("combinatorics", "combinatorics"),
            Map.entry("probability-and-statistics", "probability"),
            Map.entry("geometry", "geometry"),
            Map.entry("monotonic-stack", "stack"));

    private static final Map<String, String> FALLBACK_KOREAN_TAG_NAME = Map.ofEntries(
            Map.entry("array", "배열"),
            Map.entry("matrix", "행렬"),
            Map.entry("hash-table", "해시 테이블"),
            Map.entry("counting", "카운팅"),
            Map.entry("enumeration", "열거"),
            Map.entry("memoization", "메모이제이션"),
            Map.entry("design", "설계"),
            Map.entry("database", "데이터베이스"),
            Map.entry("interactive", "인터랙티브"),
            Map.entry("data-stream", "데이터 스트림"),
            Map.entry("monotonic-stack", "단조 스택"),
            Map.entry("monotonic-queue", "단조 큐"));

    private final SubmissionLogRepository submissionLogRepository;
    private final ProblemRepository problemRepository;
    private final TagRepository tagRepository;
    private final TagMappingRepository tagMappingRepository;
    private final UserRepository userRepository;
    private final LeagueService leagueService;
    private final RecommendProblemRepository recommendProblemRepository;
    private final LeetcodeProblemRatingRepository leetcodeProblemRatingRepository;
    private final LeetcodeTranslationService leetcodeTranslationService;

    @Transactional
    public SubmissionResponse saveLeetcodeSubmission(LeetcodeSubmissionRequest request) {
        User user = resolveUser(request.getExtensionToken());
        Problem problem = resolveProblem(request);

        if (hasText(request.getSubmitId())) {
            SubmissionLog existingLog = submissionLogRepository
                    .findByUserIdAndProblemIdAndSubmitId(user.getId(), problem.getId(), request.getSubmitId().trim())
                    .orElse(null);
            if (existingLog != null) {
                return buildDuplicateResponse(user, existingLog);
            }
        }

        LocalDateTime submittedAt = parseSubmittedAt(request.getSubmittedAt());
        boolean isSuccess = Boolean.TRUE.equals(request.getIsSuccess());

        SubmissionLog log = SubmissionLog.create(
                user,
                problem,
                SourceType.EXTENSION,
                problem.getTitle(),
                problem.getTier(),
                problem.getExternalId(),
                null,
                normalizeResult(request.getResult(), isSuccess),
                isSuccess,
                request.getCode(),
                resolveMemory(request),
                resolveExecutionTime(request),
                normalizeLanguage(request.getLanguage()),
                submittedAt);
        log.setSubmitId(trimToNull(request.getSubmitId()));
        submissionLogRepository.save(log);

        int earnedPoints = 0;
        if (isSuccess) {
            recommendProblemRepository.markSolved(user.getId(), problem.getId());
            earnedPoints = leagueService.updateLeaguePointForSolvedProblem(user, problem);
        }

        UserLeagueStatusDto statusDto = leagueService.getUserLeagueStatus(user);

        if (isSuccess) {
            long solvedCount = submissionLogRepository.countByUserIdAndProblemIdAndIsSuccessTrue(
                    user.getId(),
                    problem.getId());
            boolean isFirstSolve = solvedCount == 1;
            boolean isAlreadySolved = solvedCount > 1;

            return SubmissionResponse.builder()
                    .success(true)
                    .submissionId(log.getId())
                    .firstSolve(isFirstSolve)
                    .alreadySolved(isAlreadySolved)
                    .earnedPoints(earnedPoints)
                    .totalPoints(user.getLeaguePoint())
                    .currentRank(statusDto.getGroupRank())
                    .currentLeague(user.getLeague())
                    .leagueStatus(statusDto.getLeagueStatus())
                    .pointsToPromotion(statusDto.getPointsToPromotion())
                    .pointsToMaintenance(statusDto.getPointsToMaintenance())
                    .message(isAlreadySolved ? "Already Solved." : "LeetCode Problem Solved! (+" + earnedPoints + ")")
                    .build();
        }

        return SubmissionResponse.builder()
                .success(false)
                .submissionId(log.getId())
                .totalPoints(user.getLeaguePoint())
                .currentRank(statusDto.getGroupRank())
                .currentLeague(user.getLeague())
                .leagueStatus(statusDto.getLeagueStatus())
                .pointsToPromotion(statusDto.getPointsToPromotion())
                .pointsToMaintenance(statusDto.getPointsToMaintenance())
                .message(log.getResult())
                .build();
    }

    @Transactional
    public void upsertProblemMetadata(LeetcodeTranslationRequest.ProblemMetadata metadata) {
        if (metadata == null) return;

        LeetcodeSubmissionRequest request = new LeetcodeSubmissionRequest();
        request.setExternalId(metadata.externalId());
        request.setProblemNumber(metadata.problemNumber());
        request.setTitleSlug(metadata.titleSlug());
        request.setTitle(metadata.title());
        request.setEnglishTitle(metadata.englishTitle());
        request.setKoreanTitle(metadata.koreanTitle());
        request.setDifficulty(metadata.difficulty());
        request.setProblemUrl(metadata.problemUrl());
        request.setTags(metadata.tags().stream()
                .filter(Objects::nonNull)
                .map(this::toSubmissionTagRequest)
                .toList());

        resolveProblem(request);
    }

    private LeetcodeSubmissionRequest.TagRequest toSubmissionTagRequest(LeetcodeTranslationRequest.TagMetadata metadata) {
        LeetcodeSubmissionRequest.TagRequest tagRequest = new LeetcodeSubmissionRequest.TagRequest();
        tagRequest.setKey(metadata.key());
        tagRequest.setName(metadata.name());
        return tagRequest;
    }

    private User resolveUser(String extensionToken) {
        if (!hasText(extensionToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        return userRepository.findByExtensionToken(extensionToken.trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
    }

    private Problem resolveProblem(LeetcodeSubmissionRequest request) {
        String titleSlug = trimToNull(request.getTitleSlug());
        String externalId = titleSlug != null ? titleSlug : trimToNull(request.getExternalId());
        if (externalId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        Set<Tag> tags = resolveTags(request.getTags());
        String englishTitle = trimToNull(request.getEnglishTitle());
        if (englishTitle == null) {
            englishTitle = trimToNull(request.getTitle());
        }
        String koreanTitle = resolveKoreanTitle(request, englishTitle);
        String title = koreanTitle != null ? koreanTitle : resolveTitle(request);
        String difficulty = normalizeDifficulty(request.getDifficulty());
        DifficultyMetadata difficultyMetadata = resolveDifficultyMetadata(titleSlug, difficulty);
        String problemUrl = resolveProblemUrl(titleSlug, request.getProblemUrl());

        Problem problem = problemRepository.findByExternalIdAndSource(externalId, LEETCODE_SOURCE)
                .orElseGet(() -> resolveLegacySlugProblem(titleSlug, externalId)
                        .orElseGet(() -> problemRepository.save(new Problem(
                                LEETCODE_SOURCE,
                                externalId,
                                title,
                                difficulty,
                                problemUrl))));

        applyProblemMetadata(problem, title, englishTitle, koreanTitle, difficulty, difficultyMetadata, problemUrl, tags, request);
        return problem;
    }

    private Optional<Problem> resolveLegacySlugProblem(String titleSlug, String externalId) {
        if (!hasText(titleSlug) || titleSlug.equals(externalId)) {
            return Optional.empty();
        }

        return problemRepository.findByExternalIdAndSource(titleSlug, LEETCODE_SOURCE)
                .map(problem -> {
                    problem.setExternalId(externalId);
                    return problem;
                });
    }

    private void applyProblemMetadata(
            Problem problem,
            String title,
            String englishTitle,
            String koreanTitle,
            String difficulty,
            DifficultyMetadata difficultyMetadata,
            String problemUrl,
            Set<Tag> tags,
            LeetcodeSubmissionRequest request
    ) {
        if (!Objects.equals(problem.getTitle(), title)) {
            problem.setTitle(title);
        }
        if (!Objects.equals(problem.getEnglishTitle(), englishTitle)) {
            problem.setEnglishTitle(englishTitle);
        }
        if (!Objects.equals(problem.getKoreanTitle(), koreanTitle)) {
            problem.setKoreanTitle(koreanTitle);
        }
        if (!Objects.equals(problem.getTier(), difficulty)) {
            problem.setTier(difficulty);
        }
        if (!Objects.equals(problem.getLevel(), difficultyMetadata.level())) {
            problem.setLevel(difficultyMetadata.level());
        }
        if (!Objects.equals(problem.getLeetcodeRating(), difficultyMetadata.rating())) {
            problem.setLeetcodeRating(difficultyMetadata.rating());
        }
        if (!Objects.equals(problem.getDifficultySource(), difficultyMetadata.source())) {
            problem.setDifficultySource(difficultyMetadata.source());
        }
        if (!Objects.equals(problem.getUrl(), problemUrl)) {
            problem.setUrl(problemUrl);
        }
        String language = hasText(koreanTitle) ? "ko" : "en";
        if (!Objects.equals(problem.getLanguage(), language)) {
            problem.setLanguage(language);
        }
        if (!sameTagKeys(problem.getTags(), tags)) {
            problem.setTags(new HashSet<>(tags));
        }
    }

    private Set<Tag> resolveTags(List<LeetcodeSubmissionRequest.TagRequest> tagRequests) {
        if (tagRequests == null || tagRequests.isEmpty()) {
            return Set.of();
        }

        List<LeetcodeSubmissionRequest.TagRequest> normalizedRequests = tagRequests.stream()
                .filter(Objects::nonNull)
                .filter(tag -> hasText(tag.getKey()))
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                tag -> normalizeExternalTagKey(tag.getKey()),
                                Function.identity(),
                                (left, right) -> left,
                                java.util.LinkedHashMap::new),
                        map -> List.copyOf(map.values())));

        if (normalizedRequests.isEmpty()) {
            return Set.of();
        }

        List<String> externalKeys = normalizedRequests.stream()
                .map(tag -> normalizeExternalTagKey(tag.getKey()))
                .toList();

        Map<String, TagMapping> existingMappings = tagMappingRepository
                .findBySourceAndExternalKeyIn(LEETCODE_SOURCE, externalKeys)
                .stream()
                .collect(Collectors.toMap(TagMapping::getExternalKey, Function.identity(), (left, right) -> left));

        Set<String> candidateInternalKeys = normalizedRequests.stream()
                .map(tag -> resolveInternalTagKey(normalizeExternalTagKey(tag.getKey())))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Tag> tagsByKey = candidateInternalKeys.isEmpty()
                ? new HashMap<>()
                : tagRepository.findByKeyIn(candidateInternalKeys)
                .stream()
                .collect(Collectors.toMap(Tag::getKey, Function.identity(), (left, right) -> left));

        Set<Tag> resolvedTags = new LinkedHashSet<>();
        for (LeetcodeSubmissionRequest.TagRequest tagRequest : normalizedRequests) {
            String externalKey = normalizeExternalTagKey(tagRequest.getKey());
            TagMapping existingMapping = existingMappings.get(externalKey);
            if (existingMapping != null) {
                resolvedTags.add(existingMapping.getTag());
                continue;
            }

            String internalKey = resolveInternalTagKey(externalKey);
            Tag tag = tagsByKey.get(internalKey);
            if (tag == null) {
                tag = tagRepository.save(new Tag(internalKey, resolveKoreanTagName(externalKey, tagRequest.getName())));
                tagsByKey.put(internalKey, tag);
            }

            tagMappingRepository.save(new TagMapping(
                    tag,
                    LEETCODE_SOURCE,
                    externalKey,
                    trimToNull(tagRequest.getName())));
            resolvedTags.add(tag);
        }

        return resolvedTags;
    }

    private SubmissionResponse buildDuplicateResponse(User user, SubmissionLog existingLog) {
        UserLeagueStatusDto statusDto = leagueService.getUserLeagueStatus(user);
        boolean isSuccess = Boolean.TRUE.equals(existingLog.getIsSuccess());

        return SubmissionResponse.builder()
                .success(isSuccess)
                .submissionId(existingLog.getId())
                .alreadySolved(isSuccess)
                .totalPoints(user.getLeaguePoint())
                .currentRank(statusDto.getGroupRank())
                .currentLeague(user.getLeague())
                .leagueStatus(statusDto.getLeagueStatus())
                .pointsToPromotion(statusDto.getPointsToPromotion())
                .pointsToMaintenance(statusDto.getPointsToMaintenance())
                .message("Submission already processed.")
                .build();
    }

    private String resolveTitle(LeetcodeSubmissionRequest request) {
        String koreanTitle = trimToNull(request.getKoreanTitle());
        if (koreanTitle != null) return koreanTitle;

        String title = trimToNull(request.getTitle());
        if (title != null) return title;

        String englishTitle = trimToNull(request.getEnglishTitle());
        if (englishTitle != null) return englishTitle;

        String titleSlug = trimToNull(request.getTitleSlug());
        return titleSlug != null ? titleSlug : "제목 미상";
    }

    private String resolveKoreanTitle(LeetcodeSubmissionRequest request, String englishTitle) {
        String koreanTitle = trimToNull(request.getKoreanTitle());
        if (hasKoreanText(koreanTitle)) return koreanTitle;

        String title = trimToNull(request.getTitle());
        if (hasKoreanText(title)) return title;

        if (!hasText(englishTitle) || hasKoreanText(englishTitle)) {
            return hasKoreanText(englishTitle) ? englishTitle : null;
        }

        try {
            String translatedTitle = leetcodeTranslationService.translate(List.of(englishTitle)).get(0);
            return hasKoreanText(translatedTitle) ? trimToNull(translatedTitle) : null;
        } catch (RuntimeException error) {
            return null;
        }
    }

    private String resolveProblemUrl(String titleSlug, String rawProblemUrl) {
        String problemUrl = trimToNull(rawProblemUrl);
        if (problemUrl != null) return problemUrl;
        if (titleSlug != null) {
            return "https://leetcode.com/problems/" + titleSlug + "/description/";
        }
        return "https://leetcode.com";
    }

    private boolean sameTagKeys(Collection<Tag> currentTags, Collection<Tag> nextTags) {
        Set<String> current = currentTags.stream().map(Tag::getKey).collect(Collectors.toSet());
        Set<String> next = nextTags.stream().map(Tag::getKey).collect(Collectors.toSet());
        return current.equals(next);
    }

    private String resolveInternalTagKey(String externalKey) {
        return LEETCODE_TO_INTERNAL_TAG_KEY.getOrDefault(externalKey, externalKey.replace('-', '_'));
    }

    private String resolveKoreanTagName(String externalKey, String externalName) {
        String mappedName = FALLBACK_KOREAN_TAG_NAME.get(externalKey);
        if (mappedName != null) return mappedName;

        String requestName = trimToNull(externalName);
        if (requestName != null) return requestName;

        return externalKey.replace('-', ' ');
    }

    private String normalizeExternalTagKey(String key) {
        return key.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeDifficulty(String difficulty) {
        String value = trimToNull(difficulty);
        if (value == null) return "Unrated";

        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.equals("easy")) return "Easy";
        if (lower.equals("medium")) return "Medium";
        if (lower.equals("hard")) return "Hard";
        return value;
    }

    private DifficultyMetadata resolveDifficultyMetadata(String titleSlug, String difficulty) {
        if (titleSlug != null) {
            LeetcodeProblemRating rating = leetcodeProblemRatingRepository.findByTitleSlug(titleSlug)
                    .orElse(null);
            if (rating != null && rating.getRating() != null) {
                return new DifficultyMetadata(
                        convertRatingToLevel(rating.getRating()),
                        rating.getRating(),
                        DIFFICULTY_SOURCE_ZEROTRAC);
            }
        }

        return new DifficultyMetadata(
                resolveOfficialDifficultyLevel(difficulty),
                null,
                DIFFICULTY_SOURCE_LEETCODE_OFFICIAL);
    }

    private int convertRatingToLevel(double rating) {
        double normalized = 1 + ((rating - 1000.0) * 29.0 / 2800.0);
        return Math.max(1, Math.min(30, (int) Math.round(normalized)));
    }

    private int resolveOfficialDifficultyLevel(String difficulty) {
        String value = normalizeDifficulty(difficulty).toLowerCase(Locale.ROOT);
        if (value.equals("easy")) return 5;
        if (value.equals("medium")) return 12;
        if (value.equals("hard")) return 20;
        return 0;
    }

    private String normalizeResult(String result, boolean isSuccess) {
        String value = trimToNull(result);
        if (value != null) return value;
        return isSuccess ? "Accepted" : "Failed";
    }

    private String normalizeLanguage(String language) {
        String value = trimToNull(language);
        if (value == null) return null;

        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.contains("python")) return "python";
        if (lower.contains("java") && !lower.contains("javascript")) return "java";
        if (lower.contains("javascript")) return "javascript";
        if (lower.contains("typescript")) return "typescript";
        if (lower.contains("c++") || lower.contains("cpp")) return "cpp";
        if (lower.equals("c")) return "c";
        if (lower.contains("kotlin")) return "kotlin";
        if (lower.contains("swift")) return "swift";
        if (lower.contains("rust")) return "rust";
        if (lower.equals("go") || lower.contains("golang")) return "go";
        return lower;
    }

    private Integer resolveExecutionTime(LeetcodeSubmissionRequest request) {
        if (request.getExecutionTime() != null) return request.getExecutionTime();
        return request.getRuntimeMs();
    }

    private Integer resolveMemory(LeetcodeSubmissionRequest request) {
        if (request.getMemory() != null) return request.getMemory();
        if (request.getMemoryMb() == null) return null;
        return (int) Math.round(request.getMemoryMb());
    }

    private LocalDateTime parseSubmittedAt(String submittedAt) {
        String value = trimToNull(submittedAt);
        if (value == null) {
            return LocalDateTime.now(KST);
        }

        try {
            return OffsetDateTime.parse(value).atZoneSameInstant(KST).toLocalDateTime();
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception ignored) {
            return LocalDateTime.now(KST);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean hasKoreanText(String value) {
        return value != null && value.matches(".*[ㄱ-ㅎㅏ-ㅣ가-힣].*");
    }

    private String trimToNull(String value) {
        if (!hasText(value)) return null;
        return value.trim();
    }

    private record DifficultyMetadata(Integer level, Double rating, String source) {
    }
}
