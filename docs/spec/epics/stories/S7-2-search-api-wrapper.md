# S7-2. 검색 API 래퍼 (Backend)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core
**Priority:** High
**Estimate:** 5 Story Points

---

## 🧾 User Story

**As a** 클라이언트
**I want to** 단일 엔드포인트로 문제와 사용자를 검색하고 싶다
**So that** 프론트엔드 로직을 단순화하고 백엔드에서 검색 전략(DB LIKE vs Vector)을 유연하게 전환할 수 있다

---

## ✅ Acceptance Criteria

- [ ] `/api/v1/search` 엔드포인트 하나로 문제, 사용자, 문제집 결과를 통합 반환한다.
  - **Request:** `GET /api/v1/search?q={query}&type={all|problem|user|workbook}&page={n}&size={size}`
  - **Response Format:**
    ```json
    {
      "success": true,
      "data": {
        "problems": [
          {
            "id": 1000,
            "title": "A+B",
            "tier": "BRONZE_5",
            "matchType": "exact"
          }
        ],
        "users": [{ "id": 1, "nickname": "김포기", "tier": "SILVER_3" }],
        "workbooks": [{ "id": 1, "title": "DP 정복", "problemCount": 20 }],
        "totalCount": 42,
        "hasMore": true
      }
    }
    ```
- [ ] 쿼리 파라미터에 따라 DB 검색 또는 Vector DB 검색을 수행한다.
  - **Simple Query (2-10자):** MySQL FULLTEXT Index 또는 LIKE 검색
  - **Semantic Query (10자 이상 또는 자연어):** ChromaDB Vector Search
  - **숫자 입력:** 문제 번호 직접 조회 (우선순위 최상)
- [ ] **캐싱:** Redis에 `search:{query}:{type}:{page}` 키로 5분간 캐싱
- [ ] **Rate Limiting:** 유저당 10 req/sec (Spring Security + Redis)

---

## 🏗️ Technical Architecture

```java
// Strategy Pattern for Search
interface SearchStrategy {
  SearchResult search(String query, SearchType type, Pageable pageable);
}

class KeywordSearchStrategy implements SearchStrategy {
  // MySQL LIKE or FULLTEXT
}

class SemanticSearchStrategy implements SearchStrategy {
  // ChromaDB Vector Similarity
}

class SearchStrategySelector {
  SearchStrategy selectStrategy(String query) {
    if (isNumeric(query)) return new DirectSearchStrategy();
    if (query.length() < 10) return new KeywordSearchStrategy();
    return new SemanticSearchStrategy();
  }
}
```

---

## 🛠 Implementation Tasks

- [ ] `SearchController` 구현 (`com.peekle.api.search.SearchController`)
  - [ ] 통합 검색 엔드포인트 (`@GetMapping("/api/v1/search")`)
  - [ ] 요청 검증 및 쿼리 정규화
  - [ ] Rate Limiting 적용 (`@RateLimiter`)
- [ ] `IntegratedSearchService` 구현
  - [ ] Strategy Selector 로직
  - [ ] 병렬 검색 실행 (CompletableFuture)
  - [ ] 결과 병합 및 정렬 (relevance score 기반)
- [ ] 검색 전략 구현
  - [ ] `KeywordSearchStrategy` (JPA Specification)
  - [ ] `SemanticSearchStrategy` (ChromaDB Client)
  - [ ] `DirectSearchStrategy` (ID 직접 조회)
- [ ] Redis 캐싱 레이어 (`@Cacheable`)
- [ ] 검색 로그 기록 (analytics 목적, 비동기)

---

## 🔗 Dependencies

- **Depends on:** S7-6 (문제 임베딩 파이프라인), S7-7 (시맨틱 검색 로직)
- **Blocks:** S7-1 (통합 검색 바)

---

## 📝 Notes

- Strategy Pattern을 사용하여 검색 전략을 유연하게 전환 가능하도록 설계
- ChromaDB 연결 실패 시 Keyword Search로 fallback
- 검색 로그는 추후 인기 검색어 분석 및 추천 개선에 활용
