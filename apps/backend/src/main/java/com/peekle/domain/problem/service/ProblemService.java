package com.peekle.domain.problem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.problem.dto.ProblemSearchResponse;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.util.SolvedAcLevelUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProblemService {

    private static final String BOJ_SOURCE = "BOJ";
    private static final String SOLVED_AC_URL_TEMPLATE = "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=%d";
    private static final String BOJ_URL_TEMPLATE = "https://www.acmicpc.net/problem/%s";
    private static final long PAGE_DELAY_MILLIS = 300L;

    private final ProblemRepository problemRepository;
    private final TagRepository tagRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TransactionTemplate transactionTemplate;

    public void fetchAndSaveAllProblems(int startPage) {
        syncAllBojProblems(startPage);
    }

    public ProblemSyncSummary syncAllBojProblems(int startPage) {
        int page = Math.max(startPage, 1);
        int lastProcessedPage = page - 1;
        long fetched = 0L;
        long inserted = 0L;
        long updated = 0L;
        long unchanged = 0L;
        long failed = 0L;

        log.info("=== BOJ 문제 전체 재동기화 시작 (startPage={}) ===", page);

        while (true) {
            try {
                PageSyncResult pageSyncResult = syncSinglePage(page);
                if (!pageSyncResult.hasItems()) {
                    break;
                }

                lastProcessedPage = page;
                fetched += pageSyncResult.fetched();
                inserted += pageSyncResult.inserted();
                updated += pageSyncResult.updated();
                unchanged += pageSyncResult.unchanged();
                failed += pageSyncResult.failed();

                log.info(
                        "BOJ 동기화 페이지 완료 page={} fetched={} inserted={} updated={} unchanged={} failed={}",
                        page,
                        pageSyncResult.fetched(),
                        pageSyncResult.inserted(),
                        pageSyncResult.updated(),
                        pageSyncResult.unchanged(),
                        pageSyncResult.failed());

                page++;
                Thread.sleep(PAGE_DELAY_MILLIS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("BOJ 문제 동기화가 인터럽트되었습니다.", e);
            } catch (Exception e) {
                throw new IllegalStateException("BOJ 문제 동기화 실패 (page=" + page + ")", e);
            }
        }

        ProblemSyncSummary summary = new ProblemSyncSummary(
                Math.max(startPage, 1),
                lastProcessedPage,
                fetched,
                inserted,
                updated,
                unchanged,
                failed);

        log.info(
                "=== BOJ 문제 전체 재동기화 종료 startPage={} lastPage={} fetched={} inserted={} updated={} unchanged={} failed={} ===",
                summary.startPage(),
                summary.lastProcessedPage(),
                summary.fetched(),
                summary.inserted(),
                summary.updated(),
                summary.unchanged(),
                summary.failed());
        return summary;
    }

    private PageSyncResult syncSinglePage(int page) throws Exception {
        JsonNode items = fetchProblemItems(page);
        if (items.isEmpty()) {
            log.info("BOJ 동기화 종료 지점 도달 (page={})", page);
            return PageSyncResult.empty();
        }

        PageSyncResult result = transactionTemplate.execute(status -> {
            List<String> externalIds = new java.util.ArrayList<>();
            Set<String> pageTagKeys = new HashSet<>();

            items.forEach(item -> {
                if (item.path("problemId").isMissingNode()) {
                    return;
                }
                externalIds.add(String.valueOf(item.path("problemId").asInt()));
                collectTagKeys(item.path("tags"), pageTagKeys);
            });

            if (externalIds.isEmpty()) {
                log.warn("BOJ 동기화 페이지에 유효한 problemId가 없습니다. page={}", page);
                return new PageSyncResult(true, items.size(), 0L, 0L, 0L, items.size());
            }

            Map<String, Problem> existingProblemMap = problemRepository
                    .findBySourceAndExternalIdInWithTags(BOJ_SOURCE, externalIds)
                    .stream()
                    .collect(Collectors.toMap(Problem::getExternalId, Function.identity(), (left, right) -> left));

            Map<String, Tag> pageTagMap = pageTagKeys.isEmpty()
                    ? new HashMap<>()
                    : tagRepository.findByKeyIn(pageTagKeys)
                            .stream()
                            .collect(Collectors.toMap(Tag::getKey, Function.identity()));

            List<Problem> toInsert = new java.util.ArrayList<>();
            long inserted = 0L;
            long updated = 0L;
            long unchanged = 0L;
            long failed = 0L;

            for (JsonNode item : items) {
                try {
                    String externalId = String.valueOf(item.path("problemId").asInt());
                    String title = resolveTitle(item);
                    int level = item.path("level").asInt();
                    String tier = SolvedAcLevelUtil.convertLevelToTier(level);
                    String url = BOJ_URL_TEMPLATE.formatted(externalId);
                    Set<Tag> resolvedTags = resolveTags(item.path("tags"), pageTagMap);

                    Problem existing = existingProblemMap.get(externalId);
                    if (existing == null) {
                        Problem created = new Problem(BOJ_SOURCE, externalId, title, tier, url);
                        created.setTags(new HashSet<>(resolvedTags));
                        toInsert.add(created);
                        inserted++;
                        continue;
                    }

                    boolean changed = applyProblemChanges(existing, title, tier, url, resolvedTags);
                    if (changed) {
                        updated++;
                    } else {
                        unchanged++;
                    }
                } catch (Exception e) {
                    failed++;
                    log.warn("BOJ 문제 동기화 항목 실패 page={} rawProblemId={}", page, item.path("problemId"), e);
                }
            }

            if (!toInsert.isEmpty()) {
                problemRepository.saveAll(toInsert);
            }

            return new PageSyncResult(true, items.size(), inserted, updated, unchanged, failed);
        });
        if (result == null) {
            throw new IllegalStateException("동기화 페이지 처리 결과가 null 입니다. page=" + page);
        }
        return result;
    }

    private JsonNode fetchProblemItems(int page) throws Exception {
        String url = SOLVED_AC_URL_TEMPLATE.formatted(page);
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        if (response.getBody() == null) {
            throw new IllegalStateException("solved.ac 응답 body가 비어 있습니다.");
        }
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("items");
    }

    private void collectTagKeys(JsonNode tagsNode, Set<String> collector) {
        if (tagsNode == null || !tagsNode.isArray()) {
            return;
        }
        tagsNode.forEach(tagNode -> {
            String key = tagNode.path("key").asText("").trim();
            if (!key.isBlank()) {
                collector.add(key);
            }
        });
    }

    private Set<Tag> resolveTags(JsonNode tagsNode, Map<String, Tag> pageTagMap) {
        Set<Tag> tags = new HashSet<>();
        if (tagsNode == null || !tagsNode.isArray()) {
            return tags;
        }

        for (JsonNode tagNode : tagsNode) {
            String key = tagNode.path("key").asText("").trim();
            if (key.isBlank()) {
                continue;
            }

            String tagName = resolveTagName(tagNode, key);
            Tag tag = pageTagMap.get(key);
            if (tag == null) {
                tag = tagRepository.save(new Tag(key, tagName));
                pageTagMap.put(key, tag);
            } else if (!Objects.equals(tag.getName(), tagName)) {
                tag.updateName(tagName);
            }
            tags.add(tag);
        }
        return tags;
    }

    private String resolveTitle(JsonNode item) {
        String titleKo = item.path("titleKo").asText("").trim();
        if (!titleKo.isBlank()) {
            return titleKo;
        }

        String fallbackTitle = item.path("title").asText("").trim();
        if (!fallbackTitle.isBlank()) {
            return fallbackTitle;
        }

        return "제목 미상";
    }

    private String resolveTagName(JsonNode tagNode, String defaultName) {
        for (JsonNode displayName : tagNode.path("displayNames")) {
            if ("ko".equals(displayName.path("language").asText())) {
                String translated = displayName.path("name").asText("").trim();
                if (!translated.isBlank()) {
                    return translated;
                }
            }
        }
        return defaultName;
    }

    private boolean applyProblemChanges(Problem problem, String title, String tier, String url, Set<Tag> newTags) {
        boolean changed = false;

        if (!Objects.equals(problem.getTitle(), title)) {
            problem.setTitle(title);
            changed = true;
        }
        if (!Objects.equals(problem.getTier(), tier)) {
            problem.setTier(tier);
            changed = true;
        }
        if (!Objects.equals(problem.getUrl(), url)) {
            problem.setUrl(url);
            changed = true;
        }

        Set<String> currentTagKeys = problem.getTags().stream()
                .map(Tag::getKey)
                .collect(Collectors.toSet());
        Set<String> nextTagKeys = newTags.stream()
                .map(Tag::getKey)
                .collect(Collectors.toSet());
        if (!currentTagKeys.equals(nextTagKeys)) {
            problem.setTags(new HashSet<>(newTags));
            changed = true;
        }
        return changed;
    }

    /**
     * externalId로 problemId 조회
     * 
     * @param externalId 외부 문제 ID (예: "1000")
     * @param source     문제 출처 (기본값: "BOJ")
     * @return problemId를 포함한 Map
     * @throws BusinessException 문제를 찾을 수 없을 때
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getProblemIdByExternalId(String externalId, String source) {
        Problem problem = problemRepository.findByExternalIdAndSource(externalId, source)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROBLEM_NOT_FOUND));

        Map<String, Long> response = new HashMap<>();
        response.put("problemId", problem.getId());
        return response;
    }

    /**
     * keyword로 문제 검색 (title 또는 externalId로 검색)
     * 
     * @param keyword 검색어 (title 또는 externalId)
     * @param limit   최대 결과 개수
     * @return 검색된 문제 목록
     */
    @Transactional(readOnly = true)
    public List<ProblemSearchResponse> searchProblems(String keyword, int limit) {
        Page<Problem> problems = problemRepository.searchByKeyword(
                keyword,
                PageRequest.of(0, limit));
        return problems.getContent().stream()
                .map(ProblemSearchResponse::new)
                .toList();
    }

    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    public record ProblemSyncSummary(
            int startPage,
            int lastProcessedPage,
            long fetched,
            long inserted,
            long updated,
            long unchanged,
            long failed) {
    }

    private record PageSyncResult(
            boolean hasItems,
            long fetched,
            long inserted,
            long updated,
            long unchanged,
            long failed) {
        private static PageSyncResult empty() {
            return new PageSyncResult(false, 0L, 0L, 0L, 0L, 0L);
        }
    }

}
