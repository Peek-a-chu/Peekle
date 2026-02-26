# Epic-06: 학습자로서, 나에게 맞는 문제를 찾고 문제집을 관리하고 싶다

## 📌 Overview

이 문서는 방대한 알고리즘 문제 속에서 사용자가 원하는 문제를 효율적으로 찾을 수 있도록 돕는 검색 및 추천 시스템을 정의합니다. 또한, 사용자는 자신만의 문제집을 만들어 체계적으로 학습할 수 있습니다.

## 🏗️ Architecture Context

**Domain:** Discovery & Recommendation (Team Core)
**Dependencies:**

- ChromaDB (Vector Search Engine)
- Redis (Search Result Cache, 24h TTL)
- MySQL (Problems, Workbooks, User Preferences)
- LLM API (GPT-4o-mini for recommendation reasoning)

**Performance Targets:**

- Search latency: < 300ms (p95)
- Vector similarity search: < 500ms (p95)
- Recommendation generation: < 2s (cached 24h)

## 📋 Stories

### S7-1. 통합 검색 바 (Frontend)

🧾**User Story**

사용자로서, 이름으로 문제, 문제집 또는 사용자를 검색하고 싶다.

원하는 콘텐츠나 사람을 빠르고 정확하게 찾기 위함이다.

✅ **Acceptance Criteria**

- 검색 바 입력 시 디바운스된 자동 완성 제안 목록이 드롭다운으로 나타나야 한다.
  - **디바운스 딜레이:** 300ms
  - **최소 입력 길이:** 2자 이상
  - **최대 제안 개수:** 카테고리당 5개 (총 15개)
- 검색 결과 페이지에서 "문제", "사용자", "문제집" 탭으로 결과가 분류되어 표시되어야 한다.
  - **페이지네이션:** 탭당 20개씩 무한 스크롤
  - **빈 결과 처리:** "검색 결과가 없습니다" + 추천 키워드 제안
- **에러 핸들링:** 네트워크 오류 시 재시도 UI 표시

**🏗️ Technical Architecture**

- **State Management:** TanStack Query의 `useInfiniteQuery`로 무한 스크롤 구현
- **Caching Strategy:** 검색 쿼리를 queryKey로 사용, 5분 staleTime
- **Debouncing:** `lodash.debounce` 또는 `use-debounce` 훅 활용
- **Endpoint:** `GET /api/v1/search?q={query}&type={problem|user|workbook}&page={n}`

**🛠 Implementation Tasks**

- [ ] `GlobalSearchBar` 컴포넌트 UI 구현 (`apps/frontend/src/components/search/`)
  - [ ] 디바운스된 입력 필드 (`useDebounce` 훅)
  - [ ] 드롭다운 제안 목록 (키보드 네비게이션 지원)
  - [ ] 검색 아이콘 및 클리어 버튼
- [ ] `useSearch` 커스텀 훅 (`apps/frontend/src/hooks/useSearch.ts`)
  - [ ] TanStack Query 기반 API 호출
  - [ ] 로딩/에러 상태 관리
  - [ ] 쿼리 파라미터 동기화 (`useSearchParams`)
- [ ] `SearchResultsPage` 구현 (`apps/frontend/src/app/search/page.tsx`)
  - [ ] 탭 기반 필터링 UI
  - [ ] 검색 결과 하이라이팅 처리 (검색어 강조)
  - [ ] 무한 스크롤 구현
- [ ] 에러 바운더리 및 폴백 UI

### S7-2. 검색 API 래퍼 (Backend)

🧾**User Story**

클라이언트로서, 단일 엔드포인트로 문제와 사용자를 검색하고 싶다.

프론트엔드 로직을 단순화하고 백엔드에서 검색 전략(DB LIKE vs Vector)을 유연하게 전환하기 위함이다.

✅ **Acceptance Criteria**

- `/api/v1/search` 엔드포인트 하나로 문제, 사용자, 문제집 결과를 통합 반환한다.
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
- 쿼리 파라미터에 따라 DB 검색 또는 Vector DB 검색을 수행한다.
  - **Simple Query (2-10자):** MySQL FULLTEXT Index 또는 LIKE 검색
  - **Semantic Query (10자 이상 또는 자연어):** ChromaDB Vector Search
  - **숫자 입력:** 문제 번호 직접 조회 (우선순위 최상)
- **캐싱:** Redis에 `search:{query}:{type}:{page}` 키로 5분간 캐싱
- **Rate Limiting:** 유저당 10 req/sec (Spring Security + Redis)

**🏗️ Technical Architecture**

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

**🛠 Implementation Tasks**

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

### S7-3. 문제집 목록 & 생성 (Frontend)

🧾**User Story**

사용자로서, 다양한 문제집을 탐색하고 새로운 문제집을 생성하고 싶다.

내 학습 목적에 맞는 문제집을 찾거나, 스터디를 위한 나만의 커리큘럼을 만들기 위함이다.

✅ **Acceptance Criteria**

- "전체", "내 문제집", "북마크" 탭으로 구분된 목록을 제공한다.
  - **전체:** 모든 공개 문제집, 최신순/인기순 정렬 가능
  - **내 문제집:** 내가 생성한 문제집만 표시
  - **북마크:** 내가 스크랩한 문제집 표시
- 문제집 생성 버튼을 통해 제목과 설명을 입력하여 새 문제집을 만들 수 있어야 한다.
  - **제목:** 2-50자, 필수
  - **설명:** 0-500자, 선택
  - **공개 여부:** Private/Public 토글 (기본값: Private)
- **카드 UI:** 썸네일 + 제목 + 문제 개수 + 북마크 버튼
- **무한 스크롤:** 페이지당 20개씩 로드

**🏗️ Technical Architecture**

- **Routing:** `/workbook` (목록), `/workbook/new` (생성 폼)
- **State Management:**
  - Server State: TanStack Query (`useWorkbooks`, `useCreateWorkbook`)
  - Filter State: URL 쿼리 파라미터 (`?tab=mine&sort=latest`)
- **API Endpoints:**
  - `GET /api/v1/workbooks?tab={all|mine|bookmarked}&sort={latest|popular}&page={n}`
  - `POST /api/v1/workbooks` (Body: `{ title, description, isPublic }`)
  - `POST /api/v1/workbooks/{id}/bookmark` (북마크 토글)

**🛠 Implementation Tasks**

- [ ] `WorkbookListPage` 구현 (`apps/frontend/src/app/workbook/page.tsx`)
  - [ ] 탭 기반 필터링 UI (Shadcn Tabs)
  - [ ] 정렬 드롭다운 (최신순/인기순)
  - [ ] 무한 스크롤 (`useInfiniteQuery`)
- [ ] `WorkbookCard` 컴포넌트 (`apps/frontend/src/domains/workbook/components/WorkbookCard.tsx`)
  - [ ] 썸네일 이미지 (없으면 기본 이미지)
  - [ ] 제목, 문제 개수, 작성자
  - [ ] 북마크 버튼 (낙관적 업데이트)
- [ ] `WorkbookCreateForm` 구현 (`apps/frontend/src/app/workbook/new/page.tsx`)
  - [ ] `react-hook-form` + Zod 스키마 검증
  - [ ] 공개 여부 토글 스위치
  - [ ] 생성 성공 시 `/workbook/{id}` 리다이렉트
- [ ] `useWorkbooks` 훅 (`apps/frontend/src/domains/workbook/hooks/useWorkbooks.ts`)
  - [ ] 필터 및 정렬 파라미터 핸들링
  - [ ] 캐시 무효화 전략 (생성/삭제 시)
- [ ] `useCreateWorkbook` mutation 훅
  - [ ] 낙관적 업데이트
  - [ ] 에러 토스트 처리

### S7-4. 문제집 상세 & 편집 (Frontend)

🧾**User Story**

사용자로서, 선택한 문제집의 문제를 확인하고, 필요 시 수정하고 싶다.

문제집 내용을 파악하여 북마크하거나, 내가 만든 문제집의 구성을 업데이트하기 위함이다.

✅ **Acceptance Criteria**

- 문제집 상세 보기 시 포함된 문제 목록을 보여준다.
  - **문제 카드:** 번호, 제목, 티어, 풀이 여부 (`isSolved`)
  - **진행률 표시:** "15/20 완료" + 프로그레스 바
  - **클릭 시:** 해당 문제 페이지(BOJ 등)로 새 탭 열림
- [편집 모드] 내가 만든 문제집은 드래그 앤 드롭으로 순서를 바꾸거나, 검색을 통해 새로운 문제를 추가할 수 있어야 한다.
  - **권한 체크:** 본인 문제집만 [편집] 버튼 표시
  - **Split Layout:** 좌측(현재 문제 목록) | 우측(문제 검색 및 추가)
  - **Drag & Drop:** 순서 변경 즉시 낙관적 업데이트 + 서버 동기화
  - **문제 추가:** 검색 결과에서 [+] 버튼 클릭 → 목록에 추가
  - **문제 삭제:** 목록에서 [x] 버튼 클릭 → 확인 다이얼로그 → 삭제
- **저장 버튼:** 변경사항 있을 때만 활성화, 클릭 시 일괄 저장

**🏗️ Technical Architecture**

- **Routing:** `/workbook/{id}` (상세), `/workbook/{id}/edit` (편집 모드)
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (React DnD 대안, 성능 우수)
- **State Management:**
  - Server State: `useWorkbookDetail(id)` (TanStack Query)
  - Edit State: `useWorkbookEditStore(id)` (Zustand, 편집 세션 관리)
- **API Endpoints:**
  - `GET /api/v1/workbooks/{id}` (문제 목록 포함)
  - `PUT /api/v1/workbooks/{id}` (Body: `{ problemIds: [1000, 1001, ...] }`)
  - `DELETE /api/v1/workbooks/{id}`

**🛠 Implementation Tasks**

- [ ] `WorkbookDetailPage` 구현 (`apps/frontend/src/app/workbook/[id]/page.tsx`)
  - [ ] 문제집 헤더 (제목, 설명, 작성자, 북마크 버튼)
  - [ ] 진행률 계산 및 표시
  - [ ] 문제 목록 렌더링 (`ProblemCard` 컴포넌트)
  - [ ] [편집] 버튼 (권한 체크)
- [ ] `WorkbookEditPage` 구현 (`apps/frontend/src/app/workbook/[id]/edit/page.tsx`)
  - [ ] Split Layout (Resizable Panel, `react-resizable-panels`)
  - [ ] 좌측: 드래그 가능한 문제 목록 (`SortableContext` + `useSortable`)
  - [ ] 우측: 문제 검색 컴포넌트 (S7-1 재사용)
  - [ ] [저장] 버튼 (변경사항 감지)
- [ ] `useWorkbookEditStore` Zustand 스토어
  - [ ] 초기 데이터 로드 및 로컬 상태 초기화
  - [ ] `addProblem(problemId)`, `removeProblem(index)`, `reorderProblems(newOrder)`
  - [ ] `isDirty` 계산 (초기 데이터와 비교)
- [ ] Drag & Drop 핸들러
  - [ ] `handleDragEnd` → `reorderProblems` 호출
  - [ ] 낙관적 업데이트 (UI 즉시 반영)
- [ ] 저장 API 호출 (`useSaveWorkbook` mutation)
  - [ ] 실패 시 이전 상태로 롤백 + 에러 토스트

### S7-5. 문제집 API (Backend)

🧾**User Story**

사용자로서, 문제집 데이터를 서버에 저장하고 조회하고 싶다.

기기 간 동기화를 보장하고 타인과 공유하기 위함이다.

✅ **Acceptance Criteria**

- **Endpoint Definition**:
  - `GET /api/v1/workbooks?tab={all|mine|bookmarked}&sort={latest|popular}&page={n}&size={size}`: 전체 문제집 목록 조회
  - `GET /api/v1/workbooks/me`: 내가 만든/스크랩한 문제집 조회 (위 엔드포인트로 통합 가능)
  - `GET /api/v1/workbooks/{workbookId}`: 문제집 상세 조회 (문제 목록 포함)
  - `POST /api/v1/workbooks`: 문제집 생성
  - `PUT /api/v1/workbooks/{workbookId}`: 문제집 수정 (제목, 설명, 문제 순서)
  - `DELETE /api/v1/workbooks/{workbookId}`: 문제집 삭제 (soft delete)
  - `POST /api/v1/workbooks/{workbookId}/bookmark`: 북마크 토글

- **Request Body (Create/Update)**:

  ```json
  {
    "title": "Core CS 알고리즘",
    "description": "필수 문제 모음입니다.",
    "isPublic": true,
    "problemIds": [1000, 1001, 2309, 2557] // 배열 순서대로 저장됨
  }
  ```

- **Response (상세 조회)**:

  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "title": "Core CS 알고리즘",
      "description": "필수 문제 모음입니다.",
      "authorId": 123,
      "authorNickname": "김포기",
      "isPublic": true,
      "bookmarkCount": 42,
      "isBookmarked": false,
      "problems": [
        {
          "id": 1000,
          "title": "A+B",
          "tier": "BRONZE_5",
          "source": "BOJ",
          "isSolved": true,
          "order": 0
        },
        {
          "id": 1001,
          "title": "A-B",
          "tier": "BRONZE_5",
          "source": "BOJ",
          "isSolved": false,
          "order": 1
        }
      ],
      "createdAt": "2026-01-20T10:00:00Z",
      "updatedAt": "2026-01-21T15:30:00Z"
    }
  }
  ```

- 문제집 상세 조회 시 로그인 유저의 풀이 여부(`isSolved`)를 매핑하여 반환해야 한다.
  - **JOIN 쿼리:** `WORKBOOK_PROBLEMS` LEFT JOIN `SUBMISSION_LOGS` ON problem_id WHERE user_id = {currentUser}
  - **캐싱:** 유저별 풀이 상태는 Redis에 `user:{id}:solved` Set으로 캐싱 (24h TTL)

- **데이터 무결성:**
  - 문제집 생성 시 `problemIds` 중 존재하지 않는 문제 ID는 무시 또는 에러 반환
  - 문제집 수정 권한: 작성자만 가능 (`@PreAuthorize("#workbook.authorId == authentication.principal.id")`)
  - 삭제 시 Soft Delete (`is_deleted = true`), 북마크 관계는 유지

**🏗️ Technical Architecture**

- **Entities:**
  - `Workbook` (id, title, description, authorId, isPublic, isDeleted, createdAt, updatedAt)
  - `WorkbookProblem` (id, workbookId, problemId, orderIndex) - 순서 관리용 중간 테이블
  - `WorkbookBookmark` (id, workbookId, userId, createdAt)
- **Repository:**
  - `WorkbookRepository extends JpaRepository<Workbook, Long>`
  - Custom Query: `findAllWithFilters(WorkbookFilter filter, Pageable pageable)`
  - QueryDSL 활용: 복잡한 필터링 및 정렬
- **Service Layer:**
  - `WorkbookService`: CRUD 로직
  - `WorkbookQueryService`: 조회 최적화 (N+1 방지)
  - `WorkbookBookmarkService`: 북마크 토글 로직
- **Cache Strategy:**
  - 문제집 상세: `@Cacheable("workbook:{id}", ttl=10m)`
  - 목록: Redis 캐싱 X (변동 많음, DB 부하 낮음)
  - 풀이 상태: `user:{id}:solved` Set (문제 ID 저장)

**🛠 Implementation Tasks**

- [ ] `Workbook`, `WorkbookProblem`, `WorkbookBookmark` Entity 정의
  - [ ] 관계 매핑 (`@OneToMany`, `@ManyToOne`)
  - [ ] Soft Delete 지원 (`@Where(clause = "is_deleted = false")`)
- [ ] `WorkbookRepository`, `WorkbookProblemRepository`, `WorkbookBookmarkRepository` 생성
  - [ ] QueryDSL 설정 및 동적 쿼리 메서드
- [ ] `WorkbookController` 구현
  - [ ] 모든 엔드포인트 매핑
  - [ ] 요청 검증 (`@Valid` + DTO)
  - [ ] 권한 체크 (`@PreAuthorize`)
- [ ] `WorkbookService` 비즈니스 로직
  - [ ] 생성/수정 시 문제 ID 검증 (PROBLEMS 테이블 존재 여부)
  - [ ] 순서 변경 로직 (order_index 업데이트)
  - [ ] 북마크 토글 (중복 방지)
- [ ] `WorkbookQueryService` 조회 최적화
  - [ ] Fetch Join으로 N+1 문제 해결
  - [ ] 풀이 상태 매핑 (Redis 캐시 활용)
  - [ ] DTO 변환 (MapStruct 또는 생성자)
- [ ] Redis 캐싱 구현
  - [ ] `user:{id}:solved` Set 관리 (문제 풀이 시 갱신)
  - [ ] 문제집 상세 캐싱 (생성/수정 시 무효화)
- [ ] 단위 테스트 및 통합 테스트
  - [ ] 권한 체크 시나리오
  - [ ] 동시성 테스트 (북마크 중복 클릭)

### S7-6. 문제 임베딩 파이프라인 (AI)

🧾**User Story**

시스템으로서, 문제 설명을 벡터 임베딩으로 변환하고 싶다.

키워드가 일치하지 않아도 의미적으로 유사한 문제를 찾기 위함이다.

✅ **Acceptance Criteria**

- 신규 문제 추가 시 AI 모델을 통해 설명을 벡터화하고 Vector DB(ChromaDB)에 인덱싱해야 한다.
  - **트리거:** `POST /api/v1/problems` 또는 배치 작업 시 자동 실행
  - **임베딩 모델:** OpenAI `text-embedding-3-small` (1536 dim) 또는 로컬 모델 (sentence-transformers)
  - **Vector DB:** ChromaDB (Docker 컨테이너, localhost:8000)
- **배치 초기화:** 기존 문제 데이터 일괄 임베딩 (Spring Batch)
  - **스케줄:** 최초 1회 실행 + 주간 갱신 (매주 일요일 03:00)
  - **청크 사이즈:** 100개씩 처리
- **데이터 전처리:**
  - HTML 태그 제거
  - 특수문자 정규화
  - 한글 + 영문 혼합 처리
  - 최대 길이: 8000 토큰 (모델 제한)
- **에러 핸들링:**
  - 임베딩 실패 시 재시도 3회 (exponential backoff)
  - 실패한 문제 ID 로깅 (`embedding_failures` 테이블)

**🏗️ Technical Architecture**

**Option A: Python FastAPI Microservice (추천)**

```python
# AI Service (Python FastAPI)
POST /embed
Request: { "texts": ["문제 설명 1", "문제 설명 2"] }
Response: { "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]] }

# ChromaDB Integration
import chromadb
client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_or_create_collection("problems")
collection.add(ids=["1000"], embeddings=[[...]], metadatas=[{"title": "A+B"}])
```

**Option B: Java DJL (Deep Java Library) - 로컬 모델**

- 장점: 외부 API 의존성 없음, 비용 절감
- 단점: 성능 낮음, 메모리 사용 높음
- 권장 모델: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

**데이터 플로우:**

```
1. Spring Boot → POST /api/v1/problems (문제 생성)
2. Spring Boot → 비동기 이벤트 발행 (`ProblemCreatedEvent`)
3. EventListener → Python AI Service 호출 (임베딩 요청)
4. AI Service → OpenAI API 또는 로컬 모델
5. AI Service → ChromaDB에 벡터 저장
6. AI Service → Spring Boot에 완료 응답
7. Spring Boot → MySQL `problems` 테이블에 `is_embedded = true` 업데이트
```

**🛠 Implementation Tasks**

- [ ] **Python AI Service 구축** (`apps/ai-service/`)
  - [ ] FastAPI 프로젝트 초기화 (`poetry init`)
  - [ ] `/embed` 엔드포인트 구현
    - [ ] OpenAI API 클라이언트 (`openai` 라이브러리)
    - [ ] 배치 처리 (최대 100개씩)
    - [ ] 에러 핸들링 및 재시도 로직
  - [ ] ChromaDB 클라이언트 연결
    - [ ] `problems` 컬렉션 생성
    - [ ] 메타데이터 스키마 정의 (`id`, `title`, `source`, `tier`)
  - [ ] Dockerfile 작성 (경량 Python 이미지)
  - [ ] Health Check 엔드포인트 (`GET /health`)
- [ ] **Spring Boot 연동**
  - [ ] `EmbeddingService` 구현
    - [ ] RestTemplate 또는 WebClient로 AI Service 호출
    - [ ] 비동기 처리 (`@Async`)
  - [ ] `ProblemCreatedEvent` 이벤트 리스너
  - [ ] `is_embedded` 플래그 관리 (PROBLEMS 테이블 컬럼 추가)
- [ ] **배치 작업** (Spring Batch)
  - [ ] `EmbeddingBatchJob` 구현
    - [ ] `is_embedded = false` 문제 조회
    - [ ] 100개씩 청크 처리
    - [ ] AI Service 호출 및 결과 저장
  - [ ] 실패 로그 테이블 (`EMBEDDING_FAILURES`)
  - [ ] 스케줄러 설정 (`@Scheduled`)
- [ ] **ChromaDB Docker 설정**
  - [ ] `docker-compose.yml`에 ChromaDB 서비스 추가
  - [ ] 볼륨 마운트 (데이터 영속성)
  - [ ] 포트 매핑 (8000:8000)
- [ ] **데이터 전처리 유틸리티**
  - [ ] HTML 파싱 (`Jsoup` 또는 Python `BeautifulSoup`)
  - [ ] 텍스트 정규화 함수
  - [ ] 토큰 길이 체크 (tiktoken 라이브러리)
- [ ] **모니터링 및 로깅**
  - [ ] 임베딩 성공률 메트릭
  - [ ] 평균 처리 시간 로깅
  - [ ] 실패 원인 분석 (API 할당량 초과 등)

### S7-7. 시맨틱 검색 로직 (AI)

🧾**User Story**

사용자로서, 단순 키워드가 아닌 개념(예: "최단 경로")으로 검색하고 싶다.

문제의 의도나 유형에 맞는 연습 문제를 발견하기 위함이다.

✅ **Acceptance Criteria**

- 사용자 쿼리를 벡터로 변환하여 Vector DB에서 유사도 높은 문제들을 검색해 반환한다.
  - **쿼리 예시:** "BFS로 풀 수 있는 미로 문제", "슬라이딩 윈도우 기법"
  - **유사도 메트릭:** Cosine Similarity
  - **임계값:** 0.7 이상만 반환 (너무 낮으면 관련성 떨어짐)
  - **최대 결과:** Top 50개
- **필터링 옵션:**
  - `excludeSolved`: 이미 푼 문제 제외 (기본값: true)
  - `tierRange`: 티어 범위 지정 (예: SILVER_3 ~ GOLD_5)
  - `source`: BOJ/SWEA 필터
- **결과 정렬:**
  - 1차: 유사도 점수 (내림차순)
  - 2차: 티어 (사용자 티어 ±1 우선)
  - 3차: 풀이 수 (인기도)
- **캐싱:** 동일 쿼리는 Redis에 1시간 캐싱

**🏗️ Technical Architecture**

**검색 플로우:**

```
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
```

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

**🛠 Implementation Tasks**

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

### S7-8. 추천 엔진 (AI)

🧾**User Story**

사용자로서, 내 티어와 약점에 기반한 "다음 문제" 추천을 받고 싶다.

효율적으로 실력을 향상시키기 위함이다.

✅ **Acceptance Criteria**

- 사용자의 오답 패턴(태그)을 분석하여 유사 난이도의 문제를 선별한다.
  - **분석 기간:** 최근 30일 풀이 기록
  - **취약 태그 추출:** 오답률 50% 이상인 알고리즘 태그 (예: DP, 그리디)
  - **난이도 범위:** 현재 티어 ±1 (예: SILVER_3 → SILVER_2~SILVER_4)
  - **추천 개수:** 5개 (1일 1회 갱신)
- LLM을 이용해 "추천 사유"를 생성하고 Redis에 캐싱하여 제공한다.
  - **LLM 모델:** GPT-4o-mini (비용 효율적)
  - **프롬프트 구조:** "유저 {닉네임}은 {티어}이며, {태그}에 약합니다. 문제 {제목}을 추천하는 이유를 친근하게 2문장으로 설명해주세요."
  - **예시 출력:** "BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪"
  - **캐싱:** Redis `user:{id}:recommendations` (24시간 TTL)
- **트리거:**
  - 매일 06:00 배치 작업 (전체 유저)
  - 유저 요청 시 (`GET /api/v1/recommendations/me`) - 캐시 없으면 즉시 생성
- **폴백:** AI 서비스 실패 시 규칙 기반 추천 (취약 태그 기반, 사유 없음)

**🏗️ Technical Architecture**

**추천 생성 플로우:**

```
1. [배치 또는 API 호출] → Spring Boot `RecommendationService.generate(userId)`
2. MySQL 조회: 최근 30일 풀이 기록 (`SUBMISSION_LOGS`)
3. 취약 태그 분석:
   - 태그별 정답률 계산 (오답률 50% 이상 추출)
   - 없으면 현재 티어 평균 난이도 문제 추천
4. ChromaDB 검색:
   - 쿼리: "취약 태그명" (예: "동적 계획법 입문")
   - 필터: 티어 범위 (현재 티어 ±1)
   - 제외: 이미 푼 문제 (`user:{id}:solved` Set)
   - 결과: Top 10개
5. 우선순위 랭킹:
   - 1순위: 취약 태그 + 현재 티어
   - 2순위: 취약 태그 + 티어-1
   - 3순위: 취약 태그 + 티어+1
   - 최종 5개 선정
6. LLM 사유 생성:
   - Python AI Service `/generate-reason` 호출
   - 배치 처리 (5개 문제 한 번에 요청)
   - GPT-4o-mini API 호출 (Prompt Engineering)
7. Redis 저장:
   - Key: `user:{id}:recommendations`
   - Value: JSON 배열 (문제 정보 + 사유)
   - TTL: 86400초 (24시간)
8. 응답 반환 또는 배치 종료
```

**Redis 데이터 구조:**

```json
{
  "userId": 123,
  "generatedAt": "2026-01-20T06:00:00Z",
  "recommendations": [
    {
      "problemId": 1260,
      "title": "DFS와 BFS",
      "tier": "SILVER_2",
      "source": "BOJ",
      "weakTag": "그래프 탐색",
      "reason": "BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪",
      "relevanceScore": 0.92
    }
  ]
}
```

**LLM 프롬프트 (GPT-4o-mini):**

```
You are a friendly algorithm tutor for Peekle, a gamified coding platform.

User Profile:
- Nickname: {nickname}
- Tier: {tier}
- Weak Areas: {weakTags} (정답률 {accuracyRate}%)

Recommended Problem:
- Title: {problemTitle}
- Tier: {problemTier}
- Algorithm Tag: {algorithmTag}

Task:
Write a warm, encouraging recommendation reason in Korean (2 sentences max, 50 chars max).
Use emoji sparingly (1-2 max). Explain why this problem will help improve their weak area.

Example Output:
"BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪"
```

**🛠 Implementation Tasks**

- [ ] **사용자 취약 태그 분석**
  - [ ] `UserWeaknessAnalyzer` 서비스 구현
    - [ ] 최근 30일 풀이 기록 조회 (QueryDSL)
    - [ ] 태그별 정답률 계산
    - [ ] 오답률 50% 이상 태그 추출
    - [ ] 폴백: 데이터 부족 시 현재 티어 평균 문제
  - [ ] 단위 테스트 (Mock 데이터)
- [ ] **문제 추출 로직**
  - [ ] `RecommendationCandidateService` 구현
    - [ ] ChromaDB 검색 (취약 태그 기반)
    - [ ] 티어 필터링 (±1 범위)
    - [ ] 풀이 여부 제외 (Redis Set 조회)
    - [ ] 우선순위 랭킹 (취약도 × 티어 근접도)
    - [ ] Top 5 선정
- [ ] **GPT-4o-mini 사유 생성**
  - [ ] Python AI Service `/generate-reason` 엔드포인트
    - [ ] OpenAI API 클라이언트
    - [ ] 프롬프트 템플릿 엔진 (Jinja2)
    - [ ] 배치 처리 (5개 문제 한 번에)
    - [ ] 응답 파싱 및 검증 (길이 체크)
  - [ ] Spring Boot 연동
    - [ ] `LLMReasonService` (WebClient)
    - [ ] 타임아웃 설정 (10초)
    - [ ] 폴백: 실패 시 기본 메시지 ("이 문제를 풀어보세요!")
- [ ] **Redis 캐싱**
  - [ ] `RecommendationCacheService` 구현
    - [ ] 저장: `user:{id}:recommendations` (JSON)
    - [ ] TTL: 24시간
    - [ ] 조회: 캐시 히트 시 즉시 반환
  - [ ] 캐시 무효화 정책
    - [ ] 유저가 티어 승급/강등 시 삭제
    - [ ] 수동 갱신 API (`POST /api/v1/recommendations/refresh`)
- [ ] **배치 작업** (Spring Batch)
  - [ ] `DailyRecommendationJob` 구현
    - [ ] 전체 유저 조회 (활성 유저만)
    - [ ] 청크 처리 (100명씩)
    - [ ] 추천 생성 및 Redis 저장
    - [ ] 실패 로그 기록
  - [ ] 스케줄러: 매일 06:00 (`@Scheduled(cron = "0 0 6 * * ?")`)
- [ ] **API 엔드포인트**
  - [ ] `GET /api/v1/recommendations/me`
    - [ ] 캐시 확인 → 있으면 반환
    - [ ] 없으면 즉시 생성 (비동기)
    - [ ] 생성 중이면 "추천 준비 중" 메시지
  - [ ] `POST /api/v1/recommendations/refresh`
    - [ ] 캐시 삭제 후 재생성
    - [ ] Rate Limiting (1회/시간)
- [ ] **Frontend 연동**
  - [ ] `useRecommendations` 훅 (TanStack Query)
  - [ ] 대시보드에 추천 카드 섹션
    - [ ] 문제 썸네일 + 제목 + 티어
    - [ ] 추천 사유 표시 (말풍선 UI)
    - [ ] [도전하기] 버튼 → 문제 페이지 이동
  - [ ] 로딩 상태: 스켈레톤 UI
  - [ ] 빈 상태: "아직 추천할 문제가 없습니다. 문제를 더 풀어보세요!"
- [ ] **모니터링 및 분석**
  - [ ] 추천 클릭률 추적 (Google Analytics)
  - [ ] LLM 비용 모니터링 (OpenAI Usage API)
  - [ ] 추천 정확도 피드백 수집 (유용함/별로 버튼)
