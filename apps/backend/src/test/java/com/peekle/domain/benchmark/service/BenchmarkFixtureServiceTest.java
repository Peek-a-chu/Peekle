package com.peekle.domain.benchmark.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.domain.game.service.WorkbookPreviewCacheService;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BenchmarkFixtureServiceTest {

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private RedisGameService redisGameService;

    @Mock
    private WorkbookPreviewCacheService workbookPreviewCacheService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkbookRepository workbookRepository;

    @Mock
    private WorkbookProblemRepository workbookProblemRepository;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @TempDir
    Path tempDir;

    @Test
    void ensureProblemIdsImportsProblemsFromCsvCatalog() throws Exception {
        Path csvPath = writeCatalog("""
                "ID","TITLE","TIER","TAGS"
                "1000","A+B","Bronze 5","구현|수학"
                "1001","A-B","Bronze 5","구현"
                "1002","터렛","Silver 3","기하학|수학"
                """);

        BenchmarkFixtureService fixtureService = new BenchmarkFixtureService(
                problemRepository,
                tagRepository,
                userRepository,
                workbookRepository,
                workbookProblemRepository,
                redisGameService,
                workbookPreviewCacheService,
                new DefaultResourceLoader(),
                new ObjectMapper(),
                redisTemplate);
        ReflectionTestUtils.setField(fixtureService, "problemCatalogPath", "file:" + csvPath);

        when(tagRepository.findAll()).thenReturn(List.of());
        when(problemRepository.countBySource("BOJ")).thenReturn(0L, 3L);
        when(problemRepository.findExternalIdsBySource("BOJ")).thenReturn(List.of());

        AtomicReference<List<Problem>> savedProblemsRef = new AtomicReference<>(List.of());
        AtomicLong idSequence = new AtomicLong(1L);
        when(problemRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<Problem> problems = invocation.getArgument(0);
            problems.forEach(problem -> problem.setId(idSequence.getAndIncrement()));
            savedProblemsRef.set(new ArrayList<>(problems));
            return problems;
        });

        when(problemRepository.findBySource(eq("BOJ"), any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(1);
            List<Problem> savedProblems = savedProblemsRef.get();
            if (savedProblems.isEmpty()) {
                return Page.empty(pageable);
            }
            int end = Math.min(savedProblems.size(), pageable.getPageSize());
            return new PageImpl<>(savedProblems.subList(0, end), pageable, savedProblems.size());
        });

        List<Long> problemIds = fixtureService.ensureProblemIds(3);

        Assertions.assertEquals(List.of(1L, 2L, 3L), problemIds);
        List<Problem> savedProblems = savedProblemsRef.get();
        Assertions.assertEquals(3, savedProblems.size());
        Assertions.assertEquals("1000", savedProblems.get(0).getExternalId());
        Assertions.assertEquals("A+B", savedProblems.get(0).getTitle());
        Assertions.assertEquals("Bronze 5", savedProblems.get(0).getTier());
        Assertions.assertEquals("https://www.acmicpc.net/problem/1000", savedProblems.get(0).getUrl());
        Assertions.assertEquals(2, savedProblems.get(0).getTags().size());
    }

    @Test
    void ensureProblemIdsReplaysCatalogRowsToMeetRequestedCount() throws Exception {
        Path csvPath = writeCatalog("""
                "ID","TITLE","TIER","TAGS"
                "1000","A+B","Bronze 5","구현|수학"
                "1001","A-B","Bronze 5","구현"
                """);

        BenchmarkFixtureService fixtureService = new BenchmarkFixtureService(
                problemRepository,
                tagRepository,
                userRepository,
                workbookRepository,
                workbookProblemRepository,
                redisGameService,
                workbookPreviewCacheService,
                new DefaultResourceLoader(),
                new ObjectMapper(),
                redisTemplate);
        ReflectionTestUtils.setField(fixtureService, "problemCatalogPath", "file:" + csvPath);

        when(tagRepository.findAll()).thenReturn(List.of());
        when(problemRepository.countBySource("BOJ")).thenReturn(0L, 5L);
        when(problemRepository.findExternalIdsBySource("BOJ")).thenReturn(List.of());

        AtomicReference<List<Problem>> savedProblemsRef = new AtomicReference<>(List.of());
        AtomicLong idSequence = new AtomicLong(1L);
        when(problemRepository.saveAll(anyList())).thenAnswer(invocation -> {
            List<Problem> problems = invocation.getArgument(0);
            problems.forEach(problem -> problem.setId(idSequence.getAndIncrement()));
            savedProblemsRef.set(new ArrayList<>(problems));
            return problems;
        });

        when(problemRepository.findBySource(eq("BOJ"), any(Pageable.class))).thenAnswer(invocation -> {
            Pageable pageable = invocation.getArgument(1);
            List<Problem> savedProblems = savedProblemsRef.get();
            if (savedProblems.isEmpty()) {
                return Page.empty(pageable);
            }
            int end = Math.min(savedProblems.size(), pageable.getPageSize());
            return new PageImpl<>(savedProblems.subList(0, end), pageable, savedProblems.size());
        });

        List<Long> problemIds = fixtureService.ensureProblemIds(5);

        Assertions.assertEquals(List.of(1L, 2L, 3L, 4L, 5L), problemIds);
        List<Problem> savedProblems = savedProblemsRef.get();
        Assertions.assertEquals(5, savedProblems.size());
        Assertions.assertEquals("1000", savedProblems.get(0).getExternalId());
        Assertions.assertEquals("1001", savedProblems.get(1).getExternalId());
        Assertions.assertNotEquals(savedProblems.get(0).getExternalId(), savedProblems.get(2).getExternalId());
        Assertions.assertEquals("A+B", savedProblems.get(2).getTitle());
        Assertions.assertEquals("https://www.acmicpc.net/problem/1000", savedProblems.get(2).getUrl());
    }

    private Path writeCatalog(String csvContent) throws Exception {
        Path csvPath = tempDir.resolve("problems.csv");
        Files.writeString(csvPath, csvContent);
        return csvPath;
    }

    private Problem problem(Long id, String externalId) {
        Problem problem = new Problem("BOJ", externalId, "title-" + externalId, "Bronze 5",
                "https://www.acmicpc.net/problem/" + externalId);
        problem.setId(id);
        return problem;
    }
}
