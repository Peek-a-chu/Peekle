# S7-5. 문제집 API (Backend)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core
**Priority:** High
**Estimate:** 8 Story Points

---

## 🧾 User Story

**As a** 사용자
**I want to** 문제집 데이터를 서버에 저장하고 조회하고 싶다
**So that** 기기 간 동기화를 보장하고 타인과 공유할 수 있다

---

## ✅ Acceptance Criteria

- [ ] **Endpoint Definition**:
  - `GET /api/v1/workbooks?tab={all|mine|bookmarked}&sort={latest|popular}&page={n}&size={size}`: 전체 문제집 목록 조회
  - `GET /api/v1/workbooks/{workbookId}`: 문제집 상세 조회 (문제 목록 포함)
  - `POST /api/v1/workbooks`: 문제집 생성
  - `PUT /api/v1/workbooks/{workbookId}`: 문제집 수정 (제목, 설명, 문제 순서)
  - `DELETE /api/v1/workbooks/{workbookId}`: 문제집 삭제 (soft delete)
  - `POST /api/v1/workbooks/{workbookId}/bookmark`: 북마크 토글

- [ ] 문제집 상세 조회 시 로그인 유저의 풀이 여부(`isSolved`)를 매핑하여 반환해야 한다.
  - **JOIN 쿼리:** `WORKBOOK_PROBLEMS` LEFT JOIN `SUBMISSION_LOGS` ON problem_id WHERE user_id = {currentUser}
  - **캐싱:** 유저별 풀이 상태는 Redis에 `user:{id}:solved` Set으로 캐싱 (24h TTL)

- [ ] **데이터 무결성:**
  - 문제집 생성 시 `problemIds` 중 존재하지 않는 문제 ID는 무시 또는 에러 반환
  - 문제집 수정 권한: 작성자만 가능 (`@PreAuthorize`)
  - 삭제 시 Soft Delete (`is_deleted = true`), 북마크 관계는 유지

---

## 🏗️ Technical Architecture

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

---

## 🛠 Implementation Tasks

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

---

## 🔗 Dependencies

- **Depends on:** N/A (독립적)
- **Blocks:** S7-3 (문제집 목록 & 생성), S7-4 (문제집 상세 & 편집)

---

## 📝 Notes

- QueryDSL을 활용하여 복잡한 필터링 로직을 타입 세이프하게 구현
- N+1 문제 방지를 위해 Fetch Join 적극 활용
- 북마크 기능은 동시성 이슈를 고려하여 unique constraint 설정
