# 제품 요구 사항 문서 (PRD) - Peekle
> **버전:** 1.1 (Brief Reflected)
> **날짜:** 2026-01-17
> **상태:** 확정 (Epics 생성용 기준 문서)

---

## 1. 프로젝트 개요

**Peekle**은 "함께 공부하는 즐거움"을 극대화한 **게이미피케이션 알고리즘 스터디 플랫폼**입니다. 기존의 문제 풀이 사이트가 주는 '고립감'과 '동기 부여 부족' 문제를 **실시간 화상 소통**과 **리그 경쟁 시스템**으로 해결합니다.

### 1.1 타겟 오디언스 (페르소나)
1.  **김포기 (Gimpogi, 의지박약 취준생):**
    *   **Pain Point:** 혼자 하면 30분 만에 딴짓을 함. 강제성과 감시가 필요함.
    *   **Needs:** 화상 캠으로 서로 공부하는 모습을 공유하고(Panopticon Effect), 함께 풀면서 막히는 부분을 바로 물어보고 싶음.
2.  **이경쟁 (Lee Gyeongjaeng, 승부욕 강한 실력자):**
    *   **Pain Point:** 혼자 푸는 건 지루함. 내 실력을 증명하고 싶음.
    *   **Needs:** 티어(Rank) 상승의 쾌감과 스피드 레이스 게임을 통한 아드레날린을 원함.

### 1.2 성공 지표 (Success Metrics)
*   **North Star Metric:** **Weekly Active Learners (WAL)** - 주간 1회 이상 스터디/게임에 참여한 유저 수.
*   **KPIs:**
    *   **Retention:** 수요일 리셋 후 티어 확인을 위한 재방문율.
    *   **CCU:** 피크 타임 동시 접속자 수.
    *   **Activation:** 생성된 방 대비 실제 활성 스터디 룸 비율.

### 1.3 MVP 범위 (3주 집중 개발)
**3주 / 6인 개발**이라는 제한된 리소스를 고려하여, **"완벽한 핵심 경험"**을 제공하는 데 집중합니다. 부가 기능(모바일 앱, 자체 채점기 등)은 과감히 배제하고 **웹 기반 핵심 루프(Study-Game-League)** 완성에 올인합니다.

### 1.4 핵심 용어 및 규칙
1.  **리그 시스템 (10 Tiers) 및 초기화 정책:**
    *   **초기화 시점:** 매주 수요일 오전 06:00 (KST).
    *   **Atomic Reset:** 오전 05:55 ~ 06:05 (10분간) '점검 중' 상태로 전환.
    *   **Edge Case:** 05:59 종료 게임은 이전 주, 06:00 이후 종료는 무효.

---

## 2. 기술 아키텍처 및 품질 원칙

### 2.1 기술 스택
*   **Frontend:** Next.js 15, TypeScript, Tailwind, Shadcn/UI.
*   **Backend Interface:**
    *   **Backend Server:** Java Spring Boot.
    *   **Database:** MySQL (Main DB), Redis (Cache/PubSub), ChromaDB (Vector Search used for AI & Search).
    *   **Real-time:** SockJS (WebSocket) for signaling/chat, OpenVidu (WebRTC) for media.
*   **Shared Kernel:**
    *   `packages/shared-ui`: Video Grid, IDE Component 등 공통 UI 컴포넌트 라이브러리화.
    *   **API Integration:** Frontend는 `.env` 설정을 통해 API URL을 관리하며, API Client(Axios/Fetch)가 직접 호출한다.

### 2.2 UI/UX 표준
1.  **모바일 지원 정책 (Desktop Focus):**
    *   **전략적 제한:** 몰입도 높은 학습/경쟁 환경을 위해 **PC 환경에 집중**합니다.
    *   **View Only:** 모바일 접속 시 채팅 확인 등 최소한의 기능만 제공하거나, "PC에서 접속해주세요" 오버레이를 띄워 **학습 경험의 품질을 통제**합니다.
2.  **확장프로그램 보안:** `window.postMessage` 기반의 Handshake 프로토콜을 정의한다. 단순 글로벌 변수 체크(`window.peekle`)가 아닌, 랜덤 챌린지 토큰 교환 방식을 사용한다.

---

## 3. 라우팅 구조 및 네비게이션

### 3.1 Sitemap
*   **Public:** `/` (랜딩), `/login`, `/signup`
*   **Private:**
    *   `/home` (대시보드)
    *   `/study`, `/study/[id]` (스터디)
    *   `/game`, `/game/new`, `/game/[id]` (게임)
    *   `/workbook`, `/workbook/new`, `/workbook/[id]` (문제집)
    *   `/profile/[id]`, `/profile/[id]/history` (프로필/히스토리)
    *   `/ranking`, `/league`, `/search`

### 3.2 글로벌 레이아웃 (App Shell)
*   **LNB (Left Navigation Bar):** 화면 좌측 고정.
    *   **프로필 영역:** 닉네임, 프로필 이미지, 클릭 시 드롭다운(내 정보/로그아웃).
    *   **리그 정보 카드:** 아이콘, 티어명, 주간 점수, 리그 등수(예: 3/20), 상태 배지(승급/유지/강등). 클릭 시 `/league` 이동.
    *   **네비게이션 메뉴:** 메뉴별 아이콘과 텍스트.
    *   **하단 설정 버튼:** 클릭 시 **전역 설정 모달** 호출.
*   **레이아웃 예외:**
    *   `/study/[id]`, `/game/[id]` 진입 시 **LNB 제거**.
    *   대신 화면 좌측 상단에 `[< 뒤로 가기]` 버튼 배치하여 작업 공간 확보.

### 3.3 전역 모달 정책
1.  **설정 모달:**
    *   **Tab 1 (테마):** 다크/라이트 토글, 컬러 피커.
    *   **Tab 2 (장치):** 카메라/마이크/스피커 선택, **카메라 미리보기**, 볼륨 슬라이더 및 테스트.
2.  **초대하기 모달:** 룸(스터디/게임) 내에서 호출. 현재 링크 표시 및 복사 버튼.
3.  **확장프로그램 안내:**
    *   로그인 시 미설치 상태면 안내 모달 노출 (닫기 가능).
    *   설치 페이지(`/profile/me`) 이동 유도.

---

## 4. 상세 기능 명세 (Epics by Team Domain)

프로젝트의 효율적인 진행을 위해 에픽(Epic)을 3개의 도메인 팀으로 분류하여 관리합니다.

### 4.1 Team Core (User & Platform Domain)
> **책임 범위:** 인증, 사용자 관리, 메인 대시보드, 그리고 핵심 로직인 '리그 시스템'의 무결성 관리.

#### [Epic-01] 인증 및 온보딩
> **Target:** 김포기 & 이경쟁 공통 진입점.
1.  **로그인 (`/login`):**
    *   소셜 로그인 버튼(구글/카카오/네이버) UI만 구현.
    *   클릭 시 로직: 신규/기존 유저 여부 토글(DevTool)에 따라 `/signup` 또는 `/home` 분기.
2.  **회원가입 (`/signup`):**
    *   닉네임 입력 (Mock 데이터 기반 실시간 중복 체크, Debounce 적용).
    *   가입 완료 후 `/profile/me`로 이동하여 확장프로그램 설치 섹션 강조.

#### [Epic-02] 메인 대시보드 (`/home`)
> **Target:** 이경쟁에게는 '경쟁 현황'을, 김포기에게는 '학습 현황'을 보여줌.
1.  **리그 변화 추이 (Chart):**
    *   Recharts 라인 차트: X축(주차), Y축(티어). Tooltip 정보 표시.
2.  **활동 스트릭 (Grass):**
    *   GitHub 스타일 잔디 심기. 셀 클릭 시 일별 상세 풀이 목록(BOJ 링크, 태그) 표시.
3.  **하단 정보:**
    *   **AI 추천 문제:** 카드 UI (추천 이유 필수).
    *   **이번 주 점수 로그:** 타임라인 형태.

#### [Epic-06] 사용자 프로필 및 히스토리 (`/profile`)
1.  **프로필 상세:** 아바타, 닉네임, 팔로우/팔로워.
2.  **풀이 히스토리:** 필터(날짜/티어/출처) 및 코드 슬라이드 오버 뷰어.
3.  **설정:** 닉네임/사진 변경, **확장프로그램 상태 관리(API 토큰 발급)**.

#### [Epic-07] 랭킹 및 리그 정보
> **Target:** 이경쟁의 핵심 플레이 그라운드. 승부욕 자극.
1.  **랭킹/리그 페이지 (`/ranking`, `/league`):**
    *   **리그 리스트:** 현재 내 그룹(10~20명)의 실시간 순위 및 승급/강등 라인 시각화.
    *   **분포도:** 전체 유저 티어 분포 그래프.
    *   **주간 초기화 타임아웃:** 리셋 카운트다운 타이머.

---

### 4.2 Team Study (Education & IDE Domain)
> **책임 범위:** 학습 환경, 문제은행(Workbook), 그리고 실시간 협업 공간인 스터디룸 경험.
> **Shared Dependency:** `ObservationMode` 로직은 `packages/shared-ui`에 구현하여 Team Game의 관전 모드와 공유한다.

#### [Epic-03] 스터디 룸 시스템 (`/study`)
> **Target:** 김포기의 Pain Point(딴짓) 해결을 위한 강제 장치 제공.
*   **Pre-Join 모달:** 미디어 미리보기, **Extension Handshake** (PostMessage 방식의 보안 토큰 교환, 단순 변수 체크 지양).
*   **룸 레이아웃 (3-Column):**
    1.  **Task Area:** 문제 목록, 힌트 토글(전구 아이콘), 관찰 인디케이터.
    2.  **Workspace Area:**
        *   **비디오 그리드:** 정렬(나 > 화이트보드 > 발화자). 관찰 배지 표시.
        *   **IDE:** 언어 선택, 코드 하이라이팅.
        *   **관찰 모드 (Shared):** 타 유저 클릭 시 Read-only 코드 동기화 및 칭찬 이모지 기능.
        *   **제출 프로세스:** 클립보드 복사 -> BOJ 탭 오픈.
    3.  **Communication Area:** 채팅, 참여자 관리.

#### [Epic-05] 문제집 및 검색 (`/workbook`, `/search`)
1.  **문제집 (`/workbook`):**
    *   생성/편집: 문제 드래그 앤 드롭 순서 변경.
    *   상세: 진행률(%) 표시 및 문제 풀러 가기 (`UserWorkbookProgress` 참조).
2.  **통합 검색 (`/search`):**
    *   **Interface:** Team Game 및 AI 추천 시스템이 사용할 수 있도록 Search API를 모듈화하여 제공.
    *   키워드 검색 결과 탭 분리 (문제 / 문제집 / 유저).

---

### 4.3 Team Game (Competition & Real-time Domain)
> **책임 범위:** 긴장감 있는 경쟁 환경, 게임 룰 엔진, 실시간 상태 동기화.

#### [Epic-04] 경쟁 게임 시스템 (`/game`)
> **Target:** 이경쟁에게 아드레날린과 즉각적인 보상 제공.
1.  **게임 로비:**
    *   **필터:** 개인전(Red) / 팀전(Blue) 무드 전환.
    *   **모드 선택:**
        *   **Time Attack:** 제한 시간 내 점수 경쟁.
        *   **Speed Race:** 선착순 풀이 (스피드).
2.  **방 만들기:**
    *   설정 슬라이더(인원/시간/문제수).
    *   **문제 소스:** 랜덤(티어 범위) 또는 문제집 기반(Team Study Search Module 사용).
3.  **게임 룸 (`/game/[id]`):**
    *   **대기 상태:**
        *   Ready / Start 버튼.
        *   **팀 배정 (팀전):** 유저가 직접 팀 슬롯(Red/Blue)을 선택하여 참여한다 (**User Self-Selection**).
    *   **진행 상태:**
        *   **헤더:** 타이머 및 **실시간 스코어보드 (WebSocket Event)**.
        *   **레이아웃:** 스터디룸 기반이되 달력/힌트 등 '학습' 요소 제거.
        *   **종료:** 결과 화면 및 변동된 랭킹 포인트 표시.

---

## 5. 데이터 모델 및 Mocking 전략

### 5.1 폴더 구조 및 규칙
*   **Path:** `apps/backend/src/` (or `apps/mock-server` if separated)
*   **Persistence Strategy:**
    *   **Main DB:** MySQL (User, League, Room, GameHistory).
    *   **Cache/PubSub:** Redis (Real-time Session, Game State, Leaderboard Caching).
    *   **Vector DB:** ChromaDB (Problem Recommendation, Similar Workbook Search).
*   **Interface:** Frontend는 Service Layer를 통해 Backend API를 호출한다.

### 5.2 주요 엔티티 타입 (TypeScript)
```typescript
// 유저 티어
export enum Tier { STONE='STONE', BRONZE='BRONZE', SILVER='SILVER', GOLD='GOLD', PLATINUM='PLATINUM', EMERALD='EMERALD', DIAMOND='DIAMOND', RUBY='RUBY' }

// ... existing enums ...

// 유저-문제집 진행률 (M:N 관계 해소)
export interface UserWorkbookProgress {
  userId: string;
  workbookId: string;
  totalProblems: number;
  solvedProblems: number; // calculated field
  solvedProblemIds: number[]; // 실제 푼 문제 ID 목록 (빠른 조회를 위해 비정규화 허용)
  lastAccessedAt: string;
}

// 유저 정보 인터페이스 (확장)
export interface User {
  id: string;
  nickname: string;
  tier: Tier;
  points: number;
  streak: number; // 연속 접속일
  extensionStatus: ExtensionStatus;
}
```

// 문제 풀이 기록
export interface SolveRecord {
  id: string;
  problemId: number; // BOJ 문제 번호
  problemTitle: string;
  solvedAt: string; // ISO Date
  context: 'STUDY' | 'GAME' | 'SOLO';
  code: string;
  memory: number;
  time: number;
  // ...
}
```

### 5.3 초기 시드 데이터 (Seed Data)
*   **나 (Me):** `Tier.GOLD`, `ExtensionStatus.LINKED`. 최근 90일간 50문제 풀이 기록 보유 (스트릭 시각화용).
*   **리그:** `GOLD` 티어 리그 생성. 경쟁자 15명. 나는 승급 커트라인 부근(3위)에 위치시켜 긴장감 조성.
*   **룸:** 활성화된 스터디 2개, 게임 대기방 1개, 진행 중인 게임 1개.

---

## 6. 산출물 요구사항 및 품질 기준
1.  **완전한 목업 앱:** 모든 라우트가 연결되어야 하며, 데이터 없는 빈 화면이 존재해서는 안 됨.
2.  **인터랙션:** 모달, 탭, 필터, 검색, 정렬이 실제로 동작(로컬 상태 변경)해야 함.
3.  **반응형:** 모바일 뷰포트에서 LNB는 드로어(Drawer)로 동작하거나 하단 탭으로 변형되는 등 적절한 대응 필요.
