---
project_name: 'Peekle'
user_name: 'yeongjae'
date: '2026-01-17'
last_updated: '2026-01-17'
version: '1.0'
status: 'Implementation Ready'
---

# 프로젝트 컨텍스트 및 구현 규칙

> **AI 에이전트를 위한 중요 지침:**
> 코드를 작성하기 전에 이 문서를 반드시 읽으십시오. 이 문서는 3주 MVP 제약 사항, 기술 스택 제한 및 디자인 시스템 규칙에 대한 "진실의 원천(Source of Truth)"입니다.

---

## 1. 핵심 제약 사항 ('절대 금지' 목록)
1.  **MVP 마감:** 3주 / 개발자 6명. **"있으면 좋은(Nice-to-have)" 기능은 없음.**
2.  **모바일 지원:** **없음.** 데스크탑 전용. 모바일을 위한 복잡한 반응형 CSS를 작성하지 마십시오.
3.  **백엔드 전환:** **Spring Boot (Java)**를 사용합니다. NestJS를 제안하는 이전 프롬프트는 무시하십시오.
4.  **모킹(Mocking):** 별도의 Mock 서버 없음. 프론트엔드는 Spring Boot API에 직접 연결합니다.

---

## 2. 기술 스택

### Frontend (`apps/frontend`)
*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript (Strict)
*   **Styling:** Tailwind CSS + Shadcn/UI
*   **State:** Zustand (Client) + TanStack Query (Server State)
*   **Real-time:** `sockjs-client`, `@stomp/stompjs`, `livekit-client` (WebRTC)

### Backend (`apps/backend`)
*   **Framework:** Spring Boot 3.x
*   **Language:** Java 17+
*   **Database:** MySQL (JPA), Redis, ChromaDB
*   **API:** REST + WebSocket (STOMP)

---

## 3. 디자인 시스템 (UX/UI)

### 비주얼 아이덴티티
*   **테마:** **라이트 모드 기본** (깔끔함, 미니멀).
*   **주요 색상(Primary):** `#E24EA0` (Peekle Pink) - 브랜드/강조용.
*   **보조 색상(Secondary):** `Emerald-500` - 성공/해결됨.
*   **배경:** `White` (#ffffff) ~ `Slate-50`.
*   **폰트:** `Pretendard` (한글), `JetBrains Mono` (코드).

### 핵심 레이아웃
1.  **LNB (좌측 네비게이션 바):** 고정 240px, 흰색, 우측 테두리.
2.  **스터디 룸:** 3단 리사이저블 (과제 | 작업 공간 | 커뮤니케이션).
3.  **대시보드:** 벤토 그리드 (리그 카드, 잔디, 빠른 작업).

---

## 4. 주요 워크플로우 및 패턴

### A. 인증 (Authentication)
*   **소셜 전용:** 구글/카카오. 이메일/비밀번호 폼 없음.
*   **핸드셰이크:** 프론트엔드 확장프로그램 감지는 전역 변수가 아닌 `window.postMessage`를 사용합니다.

### B. 게임 로직 (프론트엔드 측)
*   **타이머:** 로컬 `setInterval`이 아닌 서버 시간(WebSocket)을 통해 동기화.
*   **제출:** 유저가 코드 복사 -> BOJ에 제출 -> 확장프로그램이 확인 -> 서버로 신호 전송 -> 서버가 WebSocket을 통해 게임 상태 업데이트.

### C. 디렉토리 구조
```
peekle/
├── apps/
│   ├── frontend/        # Next.js
│   └── backend/         # Spring Boot
├── packages/
│   └── shared-ui/       # (Optional) Video Grid, formatting utils
└── README.md
```

---

## 5. 구현 로드맵 (스프린트 계획)
> **목표:** 21일 이내 배포.
> **팀 구조:** 3개 스쿼드 (코어 / 스터디 / 게임).

*   **1주차 (기반 구축):** 공통 초기화, 인증 (Epic-01), 대시보드 (Epic-02), DB 스키마.
*   **2주차 (병렬 구현):**
    *   **코어:** 리그 (Epic-07), 프로필 (Epic-06).
    *   **스터디:** 스터디 룸 (Epic-03), 문제집/검색 (Epic-05).
    *   **게임:** 게임 시스템 (Epic-04).
*   **3주차 (QA 및 평가):** 통합 테스트, 버그 수정, 최종 데모.

**참고:** 구체적인 작업은 `_bmad-output/planning-artifacts/epics/*.md` 문서를 확인하십시오.


