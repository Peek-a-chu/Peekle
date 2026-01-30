package com.peekle.domain.problem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.util.SolvedAcLevelUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TagRepository tagRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TransactionTemplate transactionTemplate; // 트랜잭션 템플릿 주입

    public void fetchAndSaveAllProblems(int startPage) {
        int page = startPage;
        boolean hasMore = true;
        int totalSaved = 0;
        int totalSkipped = 0;

        System.out.println("🚀 Starting Problem Sync from Solved.ac (Page " + page + ")...");

        while (hasMore) {
            try {
                // final 변수로 만들어야 람다 내부에서 접근 가능 (page는 계속 변하므로 로컬 변수 복사)
                int currentPage = page;
                
                // 트랜잭션 범위 시작: API 호출은 트랜잭션 밖에서 하는 게 좋지만, 로직 분리가 어려우면 포함해도 됨.
                // 여기서는 API 호출 후 파싱/저장을 트랜잭션으로 묶는 게 베스트지만, 코드가 복잡해지니 통째로 묶음.
                // 또는 API 호출을 메서드로 분리해도 됨.
                
                Boolean hasNextPage = transactionTemplate.execute(status -> {
                    try {
                        String url = "https://solved.ac/api/v3/search/problem?query=solvable:true&sort=id&direction=asc&page=" + currentPage;
                        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                        JsonNode root = objectMapper.readTree(response.getBody());
                        JsonNode items = root.path("items");

                        if (items.isEmpty()) {
                            System.out.println("✅ Reached end of data at page " + currentPage);
                            return false; // Stop loop
                        }

                        List<Problem> problemsToSave = new ArrayList<>();

                        for (JsonNode item : items) {
                            String externalId = String.valueOf(item.get("problemId").asInt());
                            
                            // 이미 존재하는지 체크
                            if (problemRepository.findByExternalIdAndSource(externalId, "BOJ").isPresent()) {
                                 // totalSkipped 증가 로직은 람다 밖에서 처리하거나 여기서 로그만
                                 continue;
                            }

                            String title = item.get("titleKo").asText();
                            int level = item.get("level").asInt();
                            String tierStr = SolvedAcLevelUtil.convertLevelToTier(level);
                            String problemUrl = "https://www.acmicpc.net/problem/" + externalId;

                            Problem problem = new Problem("BOJ", externalId, title, tierStr, problemUrl);
                            
                            // 태그 처리
                            JsonNode tagsNode = item.path("tags");
                            for (JsonNode tagNode : tagsNode) {
                                String key = tagNode.get("key").asText();
                                String tagName = key;
                                for (JsonNode displayName : tagNode.path("displayNames")) {
                                    if ("ko".equals(displayName.path("language").asText())) {
                                        tagName = displayName.path("name").asText();
                                    }
                                }
                                
                                String finalTagName = tagName;
                                Tag tag = tagRepository.findByKey(key)
                                        .orElseGet(() -> tagRepository.save(new Tag(key, finalTagName)));
                                problem.addTag(tag);
                            }
                            
                            problemsToSave.add(problem);
                        }

                        if (!problemsToSave.isEmpty()) {
                            problemRepository.saveAll(problemsToSave);
                            System.out.println("Page " + currentPage + " done. Saved: " + problemsToSave.size() + " problems.");
                        }
                        
                        return true; // Continue loop
                        
                    } catch (Exception e) {
                        throw new RuntimeException(e); // 트랜잭션 롤백 유도
                    }
                });
                
                if (Boolean.FALSE.equals(hasNextPage)) {
                    hasMore = false;
                    break;
                }

                page++;
                Thread.sleep(500); 

            } catch (Exception e) {
                System.err.println("❌ Error fetching page " + page + ": " + e.getMessage());
                System.err.println("⚠️ Stopped at page " + page + ". Resume using sync?startPage=" + page);
                break;
            }
        }
        System.out.println("🏁 Sync Loop Finished. Total Saved: " + totalSaved);
    }

    /**
     * externalId로 problemId 조회
     * @param externalId 외부 문제 ID (예: "1000")
     * @param source 문제 출처 (기본값: "BOJ")
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
     * title 또는 externalId로 문제 검색
     * @param query 검색어 (title 또는 externalId)
     * @param source 문제 출처 (기본값: "BOJ")
     * @return 검색된 문제 목록 (Map 형태로 변환)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> searchProblems(String query, String source) {
        List<Problem> problems = problemRepository.searchByTitleOrExternalId(query, source);
        
        return problems.stream()
                .map(p -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("title", p.getTitle());
                    item.put("number", Integer.parseInt(p.getExternalId())); // externalId를 number로
                    item.put("externalId", p.getExternalId());
                    item.put("problemId", p.getId());
                    item.put("tier", p.getTier());
                    item.put("url", p.getUrl());
                    return item;
                })
                .collect(Collectors.toList());
    }
}
