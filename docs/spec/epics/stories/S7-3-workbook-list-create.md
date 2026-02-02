# S7-3. 문제집 목록 & 생성 (Frontend)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core
**Priority:** Medium
**Estimate:** 3 Story Points

---

## 🧾 User Story

**As a** 사용자
**I want to** 다양한 문제집을 탐색하고 새로운 문제집을 생성하고 싶다
**So that** 내 학습 목적에 맞는 문제집을 찾거나, 스터디를 위한 나만의 커리큘럼을 만들 수 있다

---

## ✅ Acceptance Criteria

- [ ] "전체", "내 문제집", "북마크" 탭으로 구분된 목록을 제공한다.
  - **전체:** 모든 공개 문제집, 최신순/인기순 정렬 가능
  - **내 문제집:** 내가 생성한 문제집만 표시
  - **북마크:** 내가 스크랩한 문제집 표시
- [ ] 문제집 생성 버튼을 통해 제목과 설명을 입력하여 새 문제집을 만들 수 있어야 한다.
  - **제목:** 2-50자, 필수
  - **설명:** 0-500자, 선택
  - **공개 여부:** Private/Public 토글 (기본값: Private)
- [ ] **카드 UI:** 썸네일 + 제목 + 문제 개수 + 북마크 버튼
- [ ] **무한 스크롤:** 페이지당 20개씩 로드

---

## 🏗️ Technical Architecture

- **Routing:** `/workbook` (목록), `/workbook/new` (생성 폼)
- **State Management:**
  - Server State: TanStack Query (`useWorkbooks`, `useCreateWorkbook`)
  - Filter State: URL 쿼리 파라미터 (`?tab=mine&sort=latest`)
- **API Endpoints:**
  - `GET /api/v1/workbooks?tab={all|mine|bookmarked}&sort={latest|popular}&page={n}`
  - `POST /api/v1/workbooks` (Body: `{ title, description, isPublic }`)
  - `POST /api/v1/workbooks/{id}/bookmark` (북마크 토글)

---

## 🛠 Implementation Tasks

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

---

## 🔗 Dependencies

- **Depends on:** S7-5 (문제집 API)
- **Blocks:** S7-4 (문제집 상세 & 편집)

---

## 📝 Notes

- 문제집 썸네일은 MVP에서는 기본 이미지 사용, 추후 커스텀 업로드 기능 추가 고려
- 북마크 기능은 낙관적 업데이트로 즉각적인 피드백 제공
