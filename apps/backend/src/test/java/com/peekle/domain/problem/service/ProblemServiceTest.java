package com.peekle.domain.problem.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.problem.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;

import java.util.Collection;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class ProblemServiceTest {

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private TransactionStatus transactionStatus;

    @Test
    void syncAllBojProblems_replacesExistingProblemTags_whenTagsChanged() {
        ProblemService problemService = new ProblemService(problemRepository, tagRepository, transactionTemplate);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(problemService, "restTemplate");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        Tag implementation = new Tag("implementation", "구현");
        Tag arithmetic = new Tag("arithmetic", "사칙연산");

        Problem existingProblem = new Problem("BOJ", "1", "기존 제목", "Bronze 5", "https://www.acmicpc.net/problem/1");
        existingProblem.setTags(new java.util.HashSet<>(Set.of(implementation, arithmetic)));

        String firstPageResponse = """
                {
                  "items": [
                    {
                      "problemId": 1,
                      "titleKo": "기존 제목",
                      "level": 1,
                      "tags": [
                        {
                          "key": "implementation",
                          "displayNames": [
                            { "language": "ko", "name": "구현" }
                          ]
                        },
                        {
                          "key": "bruteforcing",
                          "displayNames": [
                            { "language": "ko", "name": "브루트포스 알고리즘" }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        String secondPageResponse = """
                { "items": [] }
                """;

        mockServer.expect(requestTo(
                "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=1"))
                .andRespond(withSuccess(firstPageResponse, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(
                "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=2"))
                .andRespond(withSuccess(secondPageResponse, MediaType.APPLICATION_JSON));

        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });

        when(problemRepository.findBySourceAndExternalIdInWithTags(eq("BOJ"), anyList()))
                .thenReturn(List.of(existingProblem));

        when(tagRepository.findByKeyIn(anyCollection()))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    Collection<String> keys = (Collection<String>) invocation.getArgument(0);
                    return keys.stream()
                            .filter("implementation"::equals)
                            .map(k -> implementation)
                            .toList();
                });

        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(1);

        assertThat(summary.startPage()).isEqualTo(1);
        assertThat(summary.lastProcessedPage()).isEqualTo(1);
        assertThat(summary.fetched()).isEqualTo(1);
        assertThat(summary.inserted()).isEqualTo(0);
        assertThat(summary.updated()).isEqualTo(1);
        assertThat(summary.unchanged()).isEqualTo(0);
        assertThat(summary.failed()).isEqualTo(0);

        Set<String> updatedTagKeys = existingProblem.getTags().stream()
                .map(Tag::getKey)
                .collect(java.util.stream.Collectors.toSet());
        assertThat(updatedTagKeys).containsExactlyInAnyOrder("implementation", "bruteforcing");
        assertThat(updatedTagKeys).doesNotContain("arithmetic");

        verify(problemRepository, never()).saveAll(anyList());
        ArgumentCaptor<Tag> tagCaptor = ArgumentCaptor.forClass(Tag.class);
        verify(tagRepository).save(tagCaptor.capture());
        assertThat(tagCaptor.getValue().getKey()).isEqualTo("bruteforcing");
        assertThat(tagCaptor.getValue().getName()).isEqualTo("브루트포스 알고리즘");

        mockServer.verify();
    }

    @Test
    void syncAllBojProblems_updatesTierAndTags_whenBothChanged() {
        ProblemService problemService = new ProblemService(problemRepository, tagRepository, transactionTemplate);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(problemService, "restTemplate");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        Tag implementation = new Tag("implementation", "구현");
        Tag math = new Tag("math", "수학");

        Problem existingProblem = new Problem("BOJ", "1", "기존 제목", "Bronze 1", "https://www.acmicpc.net/problem/1");
        existingProblem.setTags(new java.util.HashSet<>(Set.of(implementation, math)));

        String firstPageResponse = """
                {
                  "items": [
                    {
                      "problemId": 1,
                      "titleKo": "기존 제목",
                      "level": 23,
                      "tags": [
                        {
                          "key": "implementation",
                          "displayNames": [
                            { "language": "ko", "name": "구현" }
                          ]
                        },
                        {
                          "key": "bruteforcing",
                          "displayNames": [
                            { "language": "ko", "name": "브루트포스 알고리즘" }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        String secondPageResponse = """
                { "items": [] }
                """;

        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=1"))
                .andRespond(withSuccess(firstPageResponse, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=2"))
                .andRespond(withSuccess(secondPageResponse, MediaType.APPLICATION_JSON));

        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });

        when(problemRepository.findBySourceAndExternalIdInWithTags(eq("BOJ"), anyList()))
                .thenReturn(List.of(existingProblem));

        when(tagRepository.findByKeyIn(anyCollection()))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    Collection<String> keys = (Collection<String>) invocation.getArgument(0);
                    return keys.stream()
                            .filter(key -> key.equals("implementation") || key.equals("math"))
                            .map(key -> key.equals("implementation") ? implementation : math)
                            .toList();
                });

        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(1);

        assertThat(summary.startPage()).isEqualTo(1);
        assertThat(summary.lastProcessedPage()).isEqualTo(1);
        assertThat(summary.fetched()).isEqualTo(1);
        assertThat(summary.inserted()).isEqualTo(0);
        assertThat(summary.updated()).isEqualTo(1);
        assertThat(summary.unchanged()).isEqualTo(0);
        assertThat(summary.failed()).isEqualTo(0);

        assertThat(existingProblem.getTier()).isEqualTo("Diamond 3");
        Set<String> updatedTagKeys = existingProblem.getTags().stream()
                .map(Tag::getKey)
                .collect(java.util.stream.Collectors.toSet());
        assertThat(updatedTagKeys).containsExactlyInAnyOrder("implementation", "bruteforcing");
        assertThat(updatedTagKeys).doesNotContain("math");

        verify(problemRepository, never()).saveAll(anyList());
        ArgumentCaptor<Tag> tagCaptor = ArgumentCaptor.forClass(Tag.class);
        verify(tagRepository).save(tagCaptor.capture());
        assertThat(tagCaptor.getValue().getKey()).isEqualTo("bruteforcing");
        assertThat(tagCaptor.getValue().getName()).isEqualTo("브루트포스 알고리즘");

        mockServer.verify();
    }

    @Test
    void syncAllBojProblems_updatesAcceptedUserCountLevelAndLanguage_fromSolvedAcFields() {
        ProblemService problemService = new ProblemService(problemRepository, tagRepository, transactionTemplate);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(problemService, "restTemplate");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        Tag implementation = new Tag("implementation", "구현");

        Problem existingProblem = new Problem("BOJ", "1000", "A+B", "Bronze 5",
                "https://www.acmicpc.net/problem/1000");
        existingProblem.setLevel(0);
        existingProblem.setAcceptedUserCount(0);
        existingProblem.setLanguage("en");
        existingProblem.setTags(new java.util.HashSet<>(Set.of(implementation)));

        String firstPageResponse = """
                {
                  "items": [
                    {
                      "problemId": 1000,
                      "titleKo": "A+B",
                      "title": "A+B",
                      "level": 1,
                      "acceptedUserCount": 366256,
                      "tags": [
                        {
                          "key": "implementation",
                          "displayNames": [
                            { "language": "ko", "name": "구현" }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        String secondPageResponse = """
                { "items": [] }
                """;

        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=1"))
                .andRespond(withSuccess(firstPageResponse, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=2"))
                .andRespond(withSuccess(secondPageResponse, MediaType.APPLICATION_JSON));

        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });

        when(problemRepository.findBySourceAndExternalIdInWithTags(eq("BOJ"), anyList()))
                .thenReturn(List.of(existingProblem));
        when(tagRepository.findByKeyIn(anyCollection())).thenReturn(List.of(implementation));

        ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(1);

        assertThat(summary.updated()).isEqualTo(1);
        assertThat(existingProblem.getAcceptedUserCount()).isEqualTo(366256);
        assertThat(existingProblem.getLevel()).isEqualTo(1);
        assertThat(existingProblem.getLanguage()).isEqualTo("ko");

        verify(problemRepository, never()).saveAll(anyList());
        mockServer.verify();
    }

    @Test
    void syncAllBojProblems_resolvesLanguageFromOriginalTitleLanguage_whenTitlesExist() {
        ProblemService problemService = new ProblemService(problemRepository, tagRepository, transactionTemplate);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(problemService, "restTemplate");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        Tag implementation = new Tag("implementation", "구현");

        Problem existingProblem = new Problem("BOJ", "35408", "Lonely Creatures", "Gold 1",
                "https://www.acmicpc.net/problem/35408");
        existingProblem.setLanguage("ko");
        existingProblem.setTags(new java.util.HashSet<>(Set.of(implementation)));

        String firstPageResponse = """
                {
                  "items": [
                    {
                      "problemId": 35408,
                      "titleKo": "Lonely Creatures",
                      "title": "Lonely Creatures",
                      "level": 22,
                      "acceptedUserCount": 6,
                      "titles": [
                        { "language": "en", "languageDisplayName": "en", "title": "Lonely Creatures", "isOriginal": true }
                      ],
                      "tags": [
                        {
                          "key": "implementation",
                          "displayNames": [
                            { "language": "ko", "name": "구현" }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        String secondPageResponse = """
                { "items": [] }
                """;

        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=1"))
                .andRespond(withSuccess(firstPageResponse, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=2"))
                .andRespond(withSuccess(secondPageResponse, MediaType.APPLICATION_JSON));

        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });

        when(problemRepository.findBySourceAndExternalIdInWithTags(eq("BOJ"), anyList()))
                .thenReturn(List.of(existingProblem));
        when(tagRepository.findByKeyIn(anyCollection())).thenReturn(List.of(implementation));

        ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(1);

        assertThat(summary.updated()).isEqualTo(1);
        assertThat(existingProblem.getLanguage()).isEqualTo("en");

        verify(problemRepository, never()).saveAll(anyList());
        mockServer.verify();
    }

    @Test
    void syncAllBojProblems_insertsNewProblemWithAcceptedUserCountLevelAndLanguage() {
        ProblemService problemService = new ProblemService(problemRepository, tagRepository, transactionTemplate);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(problemService, "restTemplate");
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(restTemplate).build();

        Tag implementation = new Tag("implementation", "implementation");

        String firstPageResponse = """
                {
                  "items": [
                    {
                      "problemId": 1000,
                      "titleKo": "",
                      "title": "A+B",
                      "level": 1,
                      "acceptedUserCount": 560,
                      "tags": [
                        {
                          "key": "implementation",
                          "displayNames": [
                            { "language": "en", "name": "implementation" }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        String secondPageResponse = """
                { "items": [] }
                """;

        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=1"))
                .andRespond(withSuccess(firstPageResponse, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(
                        "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=2"))
                .andRespond(withSuccess(secondPageResponse, MediaType.APPLICATION_JSON));

        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            TransactionCallback<Object> callback = (TransactionCallback<Object>) invocation.getArgument(0);
            return callback.doInTransaction(transactionStatus);
        });

        when(problemRepository.findBySourceAndExternalIdInWithTags(eq("BOJ"), anyList()))
                .thenReturn(List.of());
        when(tagRepository.findByKeyIn(anyCollection()))
                .thenReturn(List.of(implementation));

        ProblemService.ProblemSyncSummary summary = problemService.syncAllBojProblems(1);
        assertThat(summary.inserted()).isEqualTo(1);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Problem>> captor = ArgumentCaptor.forClass(List.class);
        verify(problemRepository).saveAll(captor.capture());
        List<Problem> saved = captor.getValue();
        assertThat(saved).hasSize(1);
        Problem inserted = saved.get(0);
        assertThat(inserted.getExternalId()).isEqualTo("1000");
        assertThat(inserted.getAcceptedUserCount()).isEqualTo(560);
        assertThat(inserted.getLevel()).isEqualTo(1);
        assertThat(inserted.getLanguage()).isEqualTo("en");

        mockServer.verify();
    }
}
