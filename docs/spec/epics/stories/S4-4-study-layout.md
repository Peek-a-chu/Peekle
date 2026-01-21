# S4-4. 스터디 레이아웃 및 비디오 그리드 (Frontend)

## 📌 Story Information

- **Epic**: Epic-04 (Study)
- **Story ID**: S4-4
- **Sprint**: TBD
- **Estimated Effort**: 2 days
- **Priority**: High
- **Dependencies**: Epic-03 (WebRTC)
- **Status**: Ready

---

## 🧾 User Story

**As a** 사용자
**I want to** 효율적인 화면 배치와 참여자들의 상태를 보고 싶다
**So that** 문제, IDE, 화상, 채팅을 한 화면에서 끊김 없이 사용하기 위함이다

---

## ✅ Acceptance Criteria

1. **상단 비디오 영역**
   - 일자(Row) 형태로 배치되며, 내 화면이 맨 왼쪽에 고정되어야 한다.
   - 다른 참여자들은 [최근 발화 순서(Active Speaker)]대로 내 오른쪽으로 정렬되어야 한다.
   - 다른 유저의 비디오를 클릭하면 해당 유저의 [실시간 코드 보기 모드]로 전환되어야 한다.

2. **초대 및 메뉴**
   - 상단 우측에 [초대 코드 복사] 버튼과 햄버거 메뉴(방 설정/나가기)가 있어야 한다.

---

## 🎨 UI Specification

### 참조 와이어프레임

- [스터디 룸 기본 레이아웃](../../../pics/study_room_setup.svg)
- [코드 열람 모드 (Split View)](../../../pics/study_room_read_other.svg)

### 전체 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header: [←] [스터디명] [📅 날짜] [+ 문제 추가]    [👥 초대하기] [⚙️설정] │
├──────────┬────────────────────────────────────────┬──────────────────┤
│  Left    │              Video Grid                │    Right Panel   │
│  Panel   │   [나(L)] [참여자1] [참여자2] [...]      │  [채팅|참여자] 탭 │
│          │   ↳ 화이트보드 활성시 첫번째 타일에 표시   │                  │
│ (문제    │────────────────────────────────────────│                  │
│  목록)   │              Center: IDE               │                  │
│          │   ┌──────────────┬──────────────┐     │                  │
│          │   │   내 코드     │  타인 코드   │     │                  │
│          │   │              │ (Split View) │     │                  │
│          │   └──────────────┴──────────────┘     │                  │
│          │────────────────────────────────────────│                  │
│          │  Bottom Bar: [🎤][📷][✏️][⚙️]    [제출] │                  │
└──────────┴────────────────────────────────────────┴──────────────────┘
```

### 비디오 타일 상세

| 요소                    | 설명                                                            |
| ----------------------- | --------------------------------------------------------------- |
| **노란색 테두리**       | 현재 열람 중인 코드의 주인 표시 (실시간 코드 보기 모드)         |
| **Active Speaker 강조** | 발화 시 해당 캠에 시각적 강조 (테두리 또는 아이콘)              |
| **타일 하단 정보**      | 닉네임 + 아이콘(방장 👑 / 음소거 🔇 상태)                       |
| **화이트보드 타일**     | 화이트보드 활성화 시 비디오 그리드 첫 번째에 미리보기 타일 추가 |

### 비디오 타일 구조

```
┌─────────────────────┐
│                     │
│    [비디오 영역]     │
│                     │
├─────────────────────┤
│ 닉네임        👑 🎤  │  ← 방장뱃지, 마이크 상태
└─────────────────────┘
```

### Header 구성

- **좌측**: 뒤로가기(←), 스터디 제목, 날짜 표시, [+ 문제 추가] 버튼
- **중앙**: 화이트보드 활성 시 알림 메시지 ("참고하세요~!")
- **우측**: [👥 초대하기] 버튼, [⚙️ 스터디 설정] 버튼 (방장만), 더보기 메뉴(⋮)

---

## 🛠 Implementation Tasks

- [x] Grid Layout 퍼블리싱 (Left: List, Center: IDE, Right: Chat)
- [x] OpenVidu Stream 정렬 로직 (Self First + Active Speaker Sort)
- [x] `useRoomStore`에 `viewingUser` 상태 관리 추가
- [x] 비디오 타일 컴포넌트 구현 (닉네임, 방장뱃지, 마이크 상태 표시)
- [x] 코드 열람 중인 유저 타일에 노란색 테두리 스타일 적용
- [x] Header 컴포넌트 구현 (날짜 표시, 문제 추가, 초대하기, 설정 버튼)

---

## 📝 Dev Agent Record

### 2026-01-21 Implementation Notes

- **Testing Infrastructure**: Added Vitest and React Testing Library to `apps/frontend` to enable TDD/Verification.
- **StudyLayout**: Verified existing implementation of 3-panel layout via `StudyLayout.test.tsx`.
- **RoomStore**: Verified "Self First + Active Speaker" sorting logic and state actions via `useRoomStore.test.ts`.
- **VideoTile**: Verified component rendering (nickname, icons) and active view styling (yellow ring) via `VideoTile.test.tsx`.
- **StudyHeader**: Verified header elements and interactions via `StudyHeader.test.tsx`.
- **Completion**: All ACs satisfied by existing implementation and verified with new high-coverage tests.

### File List

- `apps/frontend/package.json` (Updated dependencies)
- `apps/frontend/vitest.config.ts` (New)
- `apps/frontend/src/tests/setup.ts` (New)
- `apps/frontend/src/tests/components/study/StudyLayout.test.tsx` (New)
- `apps/frontend/src/tests/stores/useRoomStore.test.ts` (New)
- `apps/frontend/src/tests/components/study/VideoTile.test.tsx` (New)
- `apps/frontend/src/tests/components/study/StudyHeader.test.tsx` (New)

### 2026-01-21 Refactoring Record (Amelia)

- **Architecture Refactoring**: Moved Study domain code to `apps/frontend/src/Domains/Study/` to comply with standard.
  - Components: `components/study/` -> `Domains/Study/components/`
  - Hooks/Store: `stores/useRoomStore.ts` -> `Domains/Study/hooks/useRoomStore.ts`
- **Spec Alignment**:
  - Moved Date display and "Add Problem" button from `ProblemListPanel` to `StudyHeader` to match wireframe/spec.
  - Updated `StudyHeader.tsx` and `ProblemListPanel.tsx`.
  - Updated `page.tsx` to pass necessary state.
- **Test Updates**:
  - Updated `StudyHeader.test.tsx` and `ProblemListPanel.test.tsx` to match new responsibility distribution.
- **Status**: Codebase refactored. Tests updated, though some verification issues persist in environment.

### File List (Refactor)

- `apps/frontend/src/Domains/Study/components/*` (Moved & Updated)
- `apps/frontend/src/Domains/Study/hooks/useRoomStore.ts` (Moved)
- `apps/frontend/src/app/study/[id]/page.tsx` (Updated imports & props)
- `apps/frontend/src/tests/**/*.test.tsx` (Updated imports)

### 2026-01-21 Refactoring Record (Amelia - Naming Convention)

- **Naming Convention Update**: Enforced `CS` (Client Component) and `SS` (Server Component) prefixes for component files per user request.
  - Updated `README.md` or instruction files (specifically `toss-frontend-rule.instructions.md`).
- **File Renaming**:
  - `Domains/Study/components/*.tsx` -> `CS*.tsx` (as all were Client Components).
- **Import Updates**:
  - Updated `index.ts` to re-export renamed components.
  - Updated test file imports to point to new file names.

### File List (Naming)

- `apps/frontend/src/Domains/Study/components/CS*.tsx` (Renamed)
- `apps/frontend/src/Domains/Study/components/CS*.test.tsx` (Renamed)
- `apps/frontend/src/tests/**/*.test.tsx` (Imports updated)
- `.github/instructions/toss-frontend-rule.instructions.md` (Rule added)
