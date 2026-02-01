# S7-7. 시맨틱 검색 로직 (AI)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core (AI)
**Priority:** Medium
**Estimate:** 5 Story Points

---

## 🧾 User Story

**As a** 사용자
**I want to** 단순 키워드가 아닌 개념(예: "최단 경로")으로 검색하고 싶다
**So that** 문제의 의도나 유형에 맞는 연습 문제를 발견할 수 있다

---

## ✅ Acceptance Criteria

- [ ] 사용자 쿼리를 벡터로 변환하여 Vector DB에서 유사도 높은 문제들을 검색해 반환한다.
  - **쿼리 예시:** "BFS로 풀 수 있는 미로 문제", "슬라이딩 윈도우 기법"
  - **유사도 메트릭:** Cosine Similarity
  - **임계값:** 0.7 이상만 반환 (너무 낮으면 관련성 떨어짐)
  - **최대 결과:** Top 50개
- [ ] **필터링 옵션:**
  - `excludeSolved`: 이미 푼 문제 제외 (기본값: true)
  - `tierRange`: 티어 범위 지정 (예: SILVER_3 ~ GOLD_5)
  - `source`: BOJ/SWEA 필터
- [ ] **결과 정렬:**
  - 1차: 유사도 점수 (내림차순)
  - 2차: 티어 (사용자 티어 ±1 우선)
  - 3차: 풀이 수 (인기도)
- [ ] **캐싱:** 동일 쿼리는 Redis에 1시간 캐싱

---

## 🏗️ Technical Architecture

**검색 플로우:**

1. User → Frontend → "BFS로 풀 수 있는 문제" 검색
2. Frontend → Spring Boot `/api/v1/search?q=BFS로...&type=semantic`
3. Spring Boot → SemanticSearchStrategy 선택
4. Spring Boot → Python AI Service `/search` 호출
5. AI Service → 쿼리 임베딩 (OpenAI API)
6. AI Service → ChromaDB `collection.query(query_embeddings, n_results=50)`
7. AI Service → 유사도 점수 + 메타데이터 반환
8. Spring Boot → 추가 필터링 (풀이 여부, 티어)
9. Spring Boot → MySQL에서 상세 정보 조회 (JOIN)
10. Spring Boot → 정렬 및 페이지네이션
11. Spring Boot → Redis 캐싱
12. Spring Boot → Frontend에 결과 반환

**Python AI Service Endpoint:**

```python
POST /search
Request:
{
  "query": "BFS로 풀 수 있는 미로 문제",
  "n_results": 50,
  "filters": {"tier": ["SILVER_1", "SILVER_2", "GOLD_5"]}
}

Response:
{
  "results": [
    {"id": "2178", "score": 0.89, "title": "미로 탐색", "tier": "SILVER_1"},
    {"id": "1926", "score": 0.85, "title": "그림", "tier": "SILVER_1"}
  ]
}
```

---

## 🛠 Implementation Tasks

- [ ] **Python AI Service `/search` 엔드포인트**
  - [ ] 쿼리 임베딩 생성 (S7-6과 동일 모델 사용)
  - [ ] ChromaDB `query()` 호출
    - [ ] `query_embeddings`: 쿼리 벡터
    - [ ] `n_results`: 50
    - [ ] `where`: 메타데이터 필터 (tier, source)
  - [ ] 유사도 점수 계산 (ChromaDB 내장)
  - [ ] 임계값 필터링 (0.7 이상)
  - [ ] 결과 정렬 및 반환
- [ ] **Spring Boot `SemanticSearchStrategy`**
  - [ ] AI Service 호출 (WebClient)
  - [ ] 응답 파싱 및 문제 ID 추출
  - [ ] MySQL 조회: `SELECT * FROM PROBLEMS WHERE id IN (...)`
  - [ ] 사용자 풀이 여부 매핑
    - [ ] Redis `user:{id}:solved` Set 조회
    - [ ] `isSolved` 플래그 추가
  - [ ] `excludeSolved=true`인 경우 필터링
  - [ ] 2차 정렬 (티어, 풀이 수)
  - [ ] 페이지네이션 적용
- [ ] **Redis 캐싱**
  - [ ] Key: `semantic:search:{hash(query)}:{filters}`
  - [ ] TTL: 1시간
  - [ ] 캐시 히트 시 AI Service 호출 스킵
- [ ] **Frontend 연동**
  - [ ] `useSemanticSearch` 훅 (TanStack Query)
  - [ ] 검색 UI에 "시맨틱 검색" 토글 버튼
  - [ ] 필터 옵션 UI (티어 범위 슬라이더)
- [ ] **성능 최적화**
  - [ ] ChromaDB 인덱스 최적화 (HNSW 알고리즘)
  - [ ] 배치 검색 (여러 쿼리 한 번에)
  - [ ] 응답 시간 모니터링 (목표: < 500ms)
- [ ] **예외 처리**
  - [ ] AI Service 타임아웃 (5초)
  - [ ] ChromaDB 연결 실패 시 fallback to keyword search
  - [ ] 빈 결과 처리: "검색 결과가 없습니다. 키워드를 바꿔보세요."

---

## 🔗 Dependencies

- **Depends on:** S7-6 (문제 임베딩 파이프라인)
- **Blocks:** S7-2 (검색 API 래퍼)

---

## 📝 Notes

- 시맨틱 검색 정확도를 높이기 위해 사용자 피드백 수집 (검색 결과 유용함 버튼)
- ChromaDB의 HNSW 인덱스 파라미터 튜닝으로 검색 성능 최적화 가능
- 응답 시간 500ms 이상 시 키워드 검색으로 fallback 고려
