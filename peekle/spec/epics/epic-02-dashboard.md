# Epic-02: 메인 대시보드 (Main Dashboard)

## 📌 Overview
이 문서는 **메인 대시보드**에 대한 전체 에픽 및 스토리 세부 내역을 제공합니다. 사용자의 진행 상황, 통계, 탐색을 위한 중앙 허브 역할을 하며 Frontend UI와 Backend 데이터 집계 로직을 포함합니다.

## 📋 Stories

### 02.1. 대시보드 레이아웃 (Frontend)
**User Story**
> **사용자**로서, **벤토 그리드(Bento Grid) 레이아웃으로 대시보드**를 보고 싶다.
> 내 상태와 주요 지표를 한눈에 파악하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 페이지 로드 시 반응형 그리드 레이아웃이 렌더링되어야 한다.
- [ ] 헤더에 "안녕하세요, [이름]" 환영 메시지와 현재 스트릭이 표시되어야 한다.
- [ ] 해상도에 따라 그리드 배치가 적절하게 조정되어야 한다.

**🛠 Implementation Tasks**
- [ ] CSS Grid 기반 대시보드 레이아웃 퍼블리싱
- [ ] `Header` 컴포넌트 구현 및 User Context 연결

### 02.2. 대시보드 집계 API (Backend)
**User Story**
> **프론트엔드 클라이언트**로서, **모든 대시보드 데이터를 가져오는 단일 API**를 원한다.
> 네트워크 요청을 최소화하여 대시보드를 빠르게 로드하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/dashboard/me` 호출 시 티어 정보, 풀이 수, 스트릭, 최근 활동 등을 포함한 JSON을 반환해야 한다.
- [ ] 쿼리 최적화(Fetch Join 등)를 통해 N+1 문제를 방지해야 한다.

**🛠 Implementation Tasks**
- [ ] `DashboardResponse` DTO 설계
- [ ] `DashboardService` 구현 (각 도메인 서비스에서 데이터 취합)
- [ ] 쿼리 성능 테스트 및 튜닝

### 02.3. 티어 상태 카드 (Frontend)
**User Story**
> **사용자**로서, **현재 리그 티어와 진행 상황**을 보고 싶다.
> 레벨업에 대한 동기를 부여받기 위함이다.

**✅ Acceptance Criteria**
- [ ] 현재 티어 아이콘과 다음 티어까지의 진행률(Progress Bar)이 표시되어야 한다.
- [ ] 진행 바에 마우스를 올리면 툴팁으로 승급에 필요한 정확한 잔여 점수를 보여주어야 한다.

**🛠 Implementation Tasks**
- [ ] `TierCard` 컴포넌트 구현
- [ ] 티어별 아이콘 에셋 적용
- [ ] Progress Bar 애니메이션 적용

### 02.4. 활동 잔디 차트 (Frontend)
**User Story**
> **사용자**로서, **일일 코딩 활동을 그리드에 시각화**하고 싶다.
> GitHub 스타일로 스트릭을 유지하고 성취감을 얻기 위함이다.

**✅ Acceptance Criteria**
- [ ] 최근 365일간의 활동을 날짜별 색상 농도로 표현하는 캘린더 히트맵을 그려야 한다.
- [ ] 특정 셀(날짜)에 호버 시 날짜와 해결한 문제 수를 툴팁으로 보여주어야 한다.

**🛠 Implementation Tasks**
- [ ] `ActivityHeatmap` 컴포넌트 구현 (SVG or Canvas)
- [ ] 날짜별 데이터 매핑 로직 작성

### 02.5. 스트릭 계산 로직 (Backend)
**User Story**
> **시스템**으로서, **DB에서 일일 풀이 기록을 집계**하고 싶다.
> 잔디 차트에 필요한 데이터를 제공하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `daily_solved_counts` 테이블을 조회하여 날짜별 풀이 횟수 맵(`Map<Date, Integer>`)을 반환해야 한다.
- [ ] 빈 날짜는 0으로 처리하거나 클라이언트에서 처리하기 쉬운 형태로 전달해야 한다.

**🛠 Implementation Tasks**
- [ ] `DailySolvedRepository` 집계 쿼리 작성 (`GROUP BY solved_date`)
- [ ] 날짜 포맷팅 및 DTO 변환 로직

### 02.6. 티어 히스토리 차트 (Frontend)
**User Story**
> **사용자**로서, **지난 10주간의 티어 변화**를 보고 싶다.
> 내 성장 추세를 시각적으로 추적하기 위함이다.

**✅ Acceptance Criteria**
- [ ] X축(주차), Y축(티어 점수/등급)으로 구성된 라인 차트를 렌더링해야 한다.
- [ ] 데이터 포인트 호버 시 해당 시점의 정확한 티어 이름과 날짜를 보여주어야 한다.

**🛠 Implementation Tasks**
- [ ] Recharts 라이브러리 설치 및 설정
- [ ] `TierHistoryChart` 컴포넌트 구현

### 02.7. AI 추천 카드 (Frontend)
**User Story**
> **사용자**로서, **AI가 추천해주는 문제**를 보고 싶다.
> 무엇을 풀지 고민하는 시간을 줄이기 위함이다.

**✅ Acceptance Criteria**
- [ ] 문제 제목, 난이도(티어), 추천 이유(예: "최근 DP 문제를 틀려서")가 표시되어야 한다.
- [ ] "풀기(Solve)" 버튼 클릭 시 새 탭에서 해당 문제 페이지(BOJ)가 열려야 한다.

**🛠 Implementation Tasks**
- [ ] `RecommendationCard` 컴포넌트 구현
- [ ] 외부 링크 연결 처리 (`window.open`)

### 02.8. 모바일 가드 오버레이 (Frontend)
**User Story**
> **모바일 사용자**로서, **사이트가 데스크탑 전용이라는 안내**를 받고 싶다.
> 코딩이 불가능한 작은 화면에서의 오동작 경험을 방지하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 뷰포트 너비가 768px 미만일 경우 전체 화면 오버레이로 콘텐츠를 가려야 한다.
- [ ] "PC 환경에서 접속해주세요"라는 메시지와 함께 적절한 일러스트를 보여주어야 한다.

**🛠 Implementation Tasks**
- [ ] `useMediaQuery` 훅 또는 CSS Media Query 작성
- [ ] `MobileGuard` 오버레이 컴포넌트 구현
