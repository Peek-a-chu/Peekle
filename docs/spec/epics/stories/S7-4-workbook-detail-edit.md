# S7-4. 문제집 상세 & 편집 (Frontend)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core
**Priority:** Medium
**Estimate:** 5 Story Points

---

## 🧾 User Story

**As a** 사용자
**I want to** 선택한 문제집의 문제를 확인하고, 필요 시 수정하고 싶다
**So that** 문제집 내용을 파악하여 북마크하거나, 내가 만든 문제집의 구성을 업데이트할 수 있다

---

## ✅ Acceptance Criteria

- [ ] 문제집 상세 보기 시 포함된 문제 목록을 보여준다.
  - **문제 카드:** 번호, 제목, 티어, 풀이 여부 (`isSolved`)
  - **진행률 표시:** "15/20 완료" + 프로그레스 바
  - **클릭 시:** 해당 문제 페이지(BOJ 등)로 새 탭 열림
- [ ] [편집 모드] 내가 만든 문제집은 드래그 앤 드롭으로 순서를 바꾸거나, 검색을 통해 새로운 문제를 추가할 수 있어야 한다.
  - **권한 체크:** 본인 문제집만 [편집] 버튼 표시
  - **Split Layout:** 좌측(현재 문제 목록) | 우측(문제 검색 및 추가)
  - **Drag & Drop:** 순서 변경 즉시 낙관적 업데이트 + 서버 동기화
  - **문제 추가:** 검색 결과에서 [+] 버튼 클릭 → 목록에 추가
  - **문제 삭제:** 목록에서 [x] 버튼 클릭 → 확인 다이얼로그 → 삭제
- [ ] **저장 버튼:** 변경사항 있을 때만 활성화, 클릭 시 일괄 저장

---

## 🏗️ Technical Architecture

- **Routing:** `/workbook/{id}` (상세), `/workbook/{id}/edit` (편집 모드)
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (React DnD 대안, 성능 우수)
- **State Management:**
  - Server State: `useWorkbookDetail(id)` (TanStack Query)
  - Edit State: `useWorkbookEditStore(id)` (Zustand, 편집 세션 관리)
- **API Endpoints:**
  - `GET /api/v1/workbooks/{id}` (문제 목록 포함)
  - `PUT /api/v1/workbooks/{id}` (Body: `{ problemIds: [1000, 1001, ...] }`)
  - `DELETE /api/v1/workbooks/{id}`

---

## 🛠 Implementation Tasks

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

---

## 🔗 Dependencies

- **Depends on:** S7-3 (문제집 목록 & 생성), S7-5 (문제집 API)
- **Blocks:** N/A

---

## 📝 Notes

- `@dnd-kit`는 React DnD보다 성능이 우수하고 접근성이 좋아 권장
- 편집 중 페이지 이탈 시 "변경사항이 있습니다" 경고 표시
- Drag & Drop이 터치 디바이스에서도 작동하도록 테스트 필요 (단, MVP는 데스크톱 우선)
