# 3주 MVP 스프린트 계획 (Detailed)
> **목표:** 21일 안에 "완벽한 핵심 루프" (스터디 -> 게임 -> 리그) 릴리스.
> **팀 구조:** 3개 스쿼드 (Core / Study / Game), 각 2명 개발자.

## 🗓️ 전체 일정 (Overview Schedule)

| Sprint | Focus Area | Key Deliverables |
| :--- | :--- | :--- |
| **1주차** | **기초 다지기** | 프로젝트 초기화, 인증(Epic-01), 대시보드(Epic-02), DevOps 구축(Epic-00). |
| **2주차** | **전체 구현** | 스터디(Epic-03, 05), 게임(Epic-04), 리그/프로필(Epic-06, 07). |
| **3주차** | **QA & 평가** | 통합 테스트, 버그 수정, 데모 준비. |

---

## 🏃 1주차: 기초 다지기 (1-7일차)
> **테마:** "하나의 팀, 하나의 코드베이스."
> **목표:** CI/CD 파이프라인 구축, 로그인 완료, 메인 대시보드 구현.

### 🛠️ Common & DevOps (Epic-00)
> **담당:** All (Lead by DevOps)
- [ ] **Story 00.1**: Project Initial Setup (Frontend) - [Epic-00](epics/epic-00-setup.md#story-001)
- [ ] **Story 00.2**: Project Initial Setup (Backend) - [Epic-00](epics/epic-00-setup.md#story-002)
- [ ] **Story 00.3**: Jenkins CI/CD Setup (DevOps) - [Epic-00](epics/epic-00-setup.md#story-003)
- [ ] **Story 00.4**: MatterMost Notification Bot (DevOps) - [Epic-00](epics/epic-00-setup.md#story-004)
- [ ] **Story 00.5**: WebRTC Infrastructure (Coturn) (DevOps) - [Epic-00](epics/epic-00-setup.md#story-005)

### 👥 Team Core (Auth & User)
> **Focus:** Epic-01 (Auth)
- [ ] **Story 01.1**: Social Login UI (Frontend) - [Epic-01](epics/epic-01-auth.md#story-011)
- [ ] **Story 01.2**: OAuth2 Integration (Backend) - [Epic-01](epics/epic-01-auth.md#story-012)
- [ ] **Story 01.3**: Nickname Setup Form (Frontend) - [Epic-01](epics/epic-01-auth.md#story-013)
- [ ] **Story 01.4**: User Management API (Backend) - [Epic-01](epics/epic-01-auth.md#story-014)
- [ ] **Story 01.5**: Extension Installation Check (Frontend) - [Epic-01](epics/epic-01-auth.md#story-015)
- [ ] **Story 01.6**: JWT Service & Security Config (Backend) - [Epic-01](epics/epic-01-auth.md#story-016)

### 👥 Team Game (Dashboard)
> **Focus:** Epic-02 (Dashboard)
- [ ] **Story 02.1**: Dashboard Layout (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-021)
- [ ] **Story 02.2**: Dashboard Aggregation API (Backend) - [Epic-02](epics/epic-02-dashboard.md#story-022)
- [ ] **Story 02.3**: Tier Status Card (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-023)
- [ ] **Story 02.4**: Activity Grass Chart (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-024)
- [ ] **Story 02.5**: Streak Calculation Logic (Backend) - [Epic-02](epics/epic-02-dashboard.md#story-025)
- [ ] **Story 02.6**: Tier History Chart (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-026)
- [ ] **Story 02.7**: AI Recommendation Card (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-027)
- [ ] **Story 02.8**: Mobile Guard Overlay (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-028)
- [ ] **Story 02.9**: Global App Shell (LNB) (Frontend) - [Epic-02](epics/epic-02-dashboard.md#story-029)

---

## 🏃 2주차: 병렬 구현 (8-14일차)
> **테마:** "분할 정복 (Divide and Conquer)."
> **목표:** 스터디, 게임, 리그 기능 완성.

### 👥 Team Core (League & Profile)
> **Focus:** Epic-07 (League) & Epic-06 (Profile)
- [ ] **Story 06.1**: Profile UI (Frontend) - [Epic-06](epics/epic-06-profile.md#story-061)
- [ ] **Story 06.2**: History Query API (Backend) - [Epic-06](epics/epic-06-profile.md#story-062)
- [ ] **Story 06.3**: History List & Code Viewer (Frontend) - [Epic-06](epics/epic-06-profile.md#story-063)
- [ ] **Story 06.4**: Extension Security API (Backend) - [Epic-06](epics/epic-06-profile.md#story-064)
- [ ] **Story 07.1**: League Ranking Table (Frontend) - [Epic-07](epics/epic-07-league.md#story-071)
- [ ] **Story 07.2**: League Query API (Backend) - [Epic-07](epics/epic-07-league.md#story-072)
- [ ] **Story 07.3**: Tier Distribution Graph (Frontend) - [Epic-07](epics/epic-07-league.md#story-073)
- [ ] **Story 07.4**: League Scheduler (Batch) (Backend) - [Epic-07](epics/epic-07-league.md#story-074)

### 👥 Team Study (Room & Content)
> **Focus:** Epic-03 (Room) & Epic-05 (Workbook)
- [ ] **Story 03.1**: Room Management API (Backend) - [Epic-03](epics/epic-03-study-room.md#story-031)
- [ ] **Story 03.2**: Device Setup Modal (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-032)
- [ ] **Story 03.3**: 3-Column Studio Layout (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-033)
- [ ] **Story 03.4**: WebSocket Broker Config (Backend) - [Epic-03](epics/epic-03-study-room.md#story-034)
- [ ] **Story 03.5**: Monaco Editor Integration (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-035)
- [ ] **Story 03.6**: WebRTC Video Grid (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-036)
- [ ] **Story 03.7**: LiveKit Webhook Handler (Backend) - [Epic-03](epics/epic-03-study-room.md#story-037)
- [ ] **Story 03.8**: Code Synchronization (View) (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-038)
- [ ] **Story 03.9**: Observation Mode & Reacts (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-039)
- [ ] **Story 03.10**: Invite Modal (Frontend) - [Epic-03](epics/epic-03-study-room.md#story-0310)
- [ ] **Story 05.1**: Unified Search Bar (Frontend) - [Epic-05](epics/epic-05-workbook.md#story-051)
- [ ] **Story 05.2**: Search API Wrapper (Backend) - [Epic-05](epics/epic-05-workbook.md#story-052)
- [ ] **Story 05.3**: Workbook Management UI (Frontend) - [Epic-05](epics/epic-05-workbook.md#story-053)
- [ ] **Story 05.4**: Workbook API (Backend) - [Epic-05](epics/epic-05-workbook.md#story-054)
- [ ] **Story 05.5**: Problem Embedding Pipeline (AI) - [Epic-05](epics/epic-05-workbook.md#story-055)
- [ ] **Story 05.6**: Semantic Search Logic (AI) - [Epic-05](epics/epic-05-workbook.md#story-056)
- [ ] **Story 05.7**: Recommendation Engine (AI) - [Epic-05](epics/epic-05-workbook.md#story-057)

### 👥 Team Game (Game Logic)
> **Focus:** Epic-04 (Game System)
- [ ] **Story 04.1**: Game Lobby & Filters (Frontend) - [Epic-04](epics/epic-04-game-system.md#story-041)
- [ ] **Story 04.2**: Game State Management (Backend) - [Epic-04](epics/epic-04-game-system.md#story-042)
- [ ] **Story 04.3**: Game Room Waiting Area (Frontend) - [Epic-04](epics/epic-04-game-system.md#story-043)
- [ ] **Story 04.4**: Scoreboard & Timer (Frontend) - [Epic-04](epics/epic-04-game-system.md#story-044)
- [ ] **Story 04.5**: Submission Verification (Webhook) (Backend) - [Epic-04](epics/epic-04-game-system.md#story-045)
- [ ] **Story 04.6**: Submission Flow (Frontend) - [Epic-04](epics/epic-04-game-system.md#story-046)
- [ ] **Story 04.7**: Redis Game Cache (Backend) - [Epic-04](epics/epic-04-game-system.md#story-047)
- [ ] **Story 04.8**: Game Result Modal (Frontend) - [Epic-04](epics/epic-04-game-system.md#story-048)

---

## 🏃 3주차: 테스트 및 평가 준비 (15-21일차)
> **테마:** "안정화 및 다듬기."
> **목표:** 통합 테스트 완료, 버그 수정, 최종 배포.

### 통합 및 신뢰성
- [ ] 4명 이상의 동시 사용자로 "스터디 룸" 테스트 (WebRTC 부하).
- [ ] 20명 사용자로 "게임 룸" 테스트 (WebSocket 메시지 폭주).
- [ ] 리그 초기화 작업 검증 (스케줄러).
- [ ] 전체 루프 테스트 (로그인 -> 스터디 -> 게임 -> 랭킹).

### 다듬기 및 평가
- [ ] UI/UX 다듬기 (일관성, 애니메이션).
- [ ] 불필요한 로그 제거 및 리팩토링.
- [ ] **Final Release Build** 배포.
- [ ] 프로젝트 발표 및 시연.
