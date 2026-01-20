# Epic-04: 학습자로서, 나의 학습 현황을 한눈에 파악하고 성장을 관리하고 싶다

## 📌 Overview
이 문서는 사용자의 학습 활동을 시각화하고 관리하는 기능들을 정의합니다. 대시보드를 통해 일일 활동(스트릭), 리그 티어, 추천 문제 등을 확인하고, 프로필 및 환경 설정을 통해 개인화된 경험을 제공받습니다.

## 📋 Stories

### S4-1. 글로벌 앱 쉘 (LNB) (Frontend)
🧾User Story

사용자로서, 지속적인 좌측 네비게이션 바(LNB)를 원한다.

주요 기능 간의 빠른 이동과 내 핵심 정보를 항상 확인하기 위함이다.

✅ Acceptance Criteria

 [상단 프로필 영역] 사용자 아바타, 닉네임, 리그 아이콘, 리그명, 현재 점수, 순위, 승급/강등 상태가 표시되어야 한다.

 [중단 네비게이션 영역] 메인, 스터디방, 게임방, 문제집, 스터디 랭킹, 리그, 검색 버튼이 순서대로 배치되어야 한다.

 [하단 설정 영역] 최하단에 설정 버튼이 위치하며, 클릭 시 설정 모달이 열려야 한다.

 현재 라우트 경로에 따라 해당 메뉴 아이콘이 강조(Active state)되어야 한다.

**🛠 Implementation Tasks**
[ ] `Sidebar` 컴포넌트 레이아웃 구현 (Flex/Grid)
[ ] `SidebarItem` 컴포넌트 및 Active 상태 로직 (`usePathname`)
[ ] 프로필 정보 조회 및 상태 바인딩

### S4-2. 대시보드 레이아웃 (Frontend)
🧾User Story

사용자로서, 벤토 그리드(Bento Grid) 레이아웃으로 대시보드를 보고 싶다.

내 상태와 주요 지표를 한눈에 파악하기 위함이다.

✅ Acceptance Criteria

 페이지 로드 시 반응형 그리드 레이아웃이 렌더링되어야 한다.

 헤더에 "안녕하세요, [이름]" 환영 메시지와 현재 스트릭이 표시되어야 한다.

 해상도에 따라 그리드 배치가 적절하게 조정되어야 한다.

**🛠 Implementation Tasks**
[ ] CSS Grid 기반 대시보드 레이아웃 퍼블리싱
[ ] `Header` 컴포넌트 구현 및 User Context 연결

### S4-3. 대시보드 집계 API (Backend)
🧾User Story

프론트엔드 클라이언트로서, 모든 대시보드 데이터를 가져오는 단일 API를 원한다.

네트워크 요청을 최소화하여 대시보드를 빠르게 로드하기 위함이다.

✅ Acceptance Criteria

 `GET /api/v1/dashboard/me` 호출 시 티어 정보, 풀이 수, 스트릭, 최근 활동 등을 포함한 JSON을 반환해야 한다.

 쿼리 최적화(Fetch Join 등)를 통해 N+1 문제를 방지해야 한다.

**🛠 Implementation Tasks**
[ ] `DashboardResponse` DTO 설계
[ ] `DashboardService` 구현 (각 도메인 서비스에서 데이터 취합)
[ ] 쿼리 성능 테스트 및 튜닝

### S4-4. 티어 상태 카드 (Frontend)
🧾User Story

사용자로서, 현재 리그 티어와 진행 상황을 보고 싶다.

레벨업에 대한 동기를 부여받기 위함이다.

✅ Acceptance Criteria

 현재 티어 아이콘과 다음 티어까지의 진행률(Progress Bar)이 표시되어야 한다.

 진행 바에 마우스를 올리면 툴팁으로 승급에 필요한 정확한 잔여 점수를 보여주어야 한다.

**🛠 Implementation Tasks**
[ ] `TierCard` 컴포넌트 구현
[ ] 티어별 아이콘 에셋 적용
[ ] Progress Bar 애니메이션 적용

### S4-5. 활동 잔디 차트 (Frontend)
🧾User Story

사용자로서, 일일 코딩 활동을 그리드에 시각화하고 싶다.

GitHub 스타일로 스트릭을 유지하고 성취감을 얻기 위함이다.

✅ Acceptance Criteria

 최근 365일간의 활동을 날짜별 색상 농도로 표현하는 캘린더 히트맵을 그려야 한다.

 특정 셀(날짜)에 호버 시 날짜와 해결한 문제 수를 툴팁으로 보여주어야 한다.

**🛠 Implementation Tasks**
[ ] `ActivityHeatmap` 컴포넌트 구현 (SVG or Canvas)
[ ] 날짜별 데이터 매핑 로직 작성

### S4-6. 스트릭 계산 로직 (Backend)
🧾User Story

시스템으로서, DB에서 일일 풀이 기록을 집계하고 싶다.

잔디 차트에 필요한 데이터를 제공하기 위함이다.

✅ Acceptance Criteria

 `daily_solved_counts` 테이블을 조회하여 날짜별 풀이 횟수 맵(`Map<Date, Integer>`)을 반환해야 한다.

 빈 날짜는 0으로 처리하거나 클라이언트에서 처리하기 쉬운 형태로 전달해야 한다.

**🛠 Implementation Tasks**
[ ] `DailySolvedRepository` 집계 쿼리 작성 (`GROUP BY solved_date`)
[ ] 날짜 포맷팅 및 DTO 변환 로직

### S4-7. 티어 히스토리 차트 (Frontend)
🧾User Story

사용자로서, 지난 10주간의 티어 변화를 보고 싶다.

내 성장 추세를 시각적으로 추적하기 위함이다.

✅ Acceptance Criteria

 X축(주차), Y축(티어 점수/등급)으로 구성된 라인 차트를 렌더링해야 한다.

 데이터 포인트 호버 시 해당 시점의 정확한 티어 이름과 날짜를 보여주어야 한다.

**🛠 Implementation Tasks**
[ ] Recharts 라이브러리 설치 및 설정
[ ] `TierHistoryChart` 컴포넌트 구현

### S4-8. AI 추천 카드 (Frontend)
🧾User Story

사용자로서, AI가 추천해주는 문제를 보고 싶다.

무엇을 풀지 고민하는 시간을 줄이기 위함이다.

✅ Acceptance Criteria

 문제 제목, 난이도(티어), 추천 이유(예: "최근 DP 문제를 틀려서")가 표시되어야 한다.

 "풀기(Solve)" 버튼 클릭 시 새 탭에서 해당 문제 페이지(BOJ)가 열려야 한다.

**🛠 Implementation Tasks**
[ ] `RecommendationCard` 컴포넌트 구현
[ ] 외부 링크 연결 처리 (`window.open`)

### S4-9. 모바일 가드 오버레이 (Frontend)
🧾User Story

모바일 사용자로서, 사이트가 데스크탑 전용이라는 안내를 받고 싶다.

코딩이 불가능한 작은 화면에서의 오동작 경험을 방지하기 위함이다.

✅ Acceptance Criteria

 뷰포트 너비가 768px 미만일 경우 전체 화면 오버레이로 콘텐츠를 가려야 한다.

 "PC 환경에서 접속해주세요"라는 메시지와 함께 적절한 일러스트를 보여주어야 한다.

**🛠 Implementation Tasks**
[ ] `useMediaQuery` 훅 또는 CSS Media Query 작성
[ ] `MobileGuard` 오버레이 컴포넌트 구현

### S4-10. 프로필 UI (Frontend)
🧾User Story

사용자로서, 내 프로필 통계를 보고 설정을 관리하고 싶다.

내 정보를 최신 상태로 유지하고 성과를 확인하기 위함이다.

✅ Acceptance Criteria

 프로필 페이지 상단에 아바타, 닉네임, 현재 티어 배지가 표시되어야 한다.

 내 전체 활동 요약(총 풀이 수, 승률 등)이 섹션별로 구분되어야 한다.

**🛠 Implementation Tasks**
[ ] `ProfilePage` 레이아웃 구현
[ ] 통계 대시보드 UI 컴포넌트 재사용

### S4-11. 히스토리 조회 API (Backend)
🧾User Story

사용자로서, 과거 제출 내역을 목록 형태로 조회하고 싶다.

내가 푼 문제들과 결과를 다시 검토하기 위함이다.

✅ Acceptance Criteria

 **Endpoint**: `GET /api/v1/users/{userId}/history`

 **Query Parameters**:
   - `page`: 페이지 번호 (Default: 0)
   - `size`: 페이지 크기 (Default: 20)
   - `startDate`, `endDate`: 조회 기간 (Optional, YYYY-MM-DD)
   - `result`: 결과 필터 (`SUCCESS`, `FAIL`, Optional)

 **Response**: `Page<SubmissionLogResponse>`
   - 포함 필드: `id`, `problemId`, `problemTitle` (역정규화 데이터), `problemTier` (역정규화 데이터)
   - `result`, `memory`, `executionTime`, `language`, `submittedAt`, `sourceType`

 **Performance**: 역정규화된 컬럼을 활용하여 `PROBLEMS` 테이블 조인 없이 단일 테이블 조회로 처리해야 한다.

**🛠 Implementation Tasks**
[ ] `SubmissionLogRepository` 조회 메소드 작성 (`Pageable` 및 `QueryDSL` 활용)
[ ] 동적 쿼리 구현 (기간 및 결과 필터링)
[ ] `SubmissionLogResponse` DTO 매핑

### S4-12. 히스토리 목록 & 코드 뷰어 (Frontend)
🧾User Story

사용자로서, 과거에 푼 문제의 소스 코드를 다시 보고 싶다.

내 풀이 방식을 복기하거나 개선점을 찾기 위함이다.

✅ Acceptance Criteria

 히스토리 목록 테이블에 날짜, 문제 이름, 결과(성공여부), 사용 언어, 실행 시간이 표시되어야 한다.

 [페이지네이션] 목록 하단에 페이지 번호, 이전/다음 버튼이 있는 페이지네이션 UI를 제공해야 한다. (무한 스크롤 아님)

 특정 행을 클릭하면 모달이 열리고, 당시 제출했던 코드가 읽기 전용 에디터에 로드되어야 한다.

 코드 복사 버튼이 제공되어야 한다.

**🛠 Implementation Tasks**
[ ] `SubmissionTable` 컴포넌트 구현 (TanStack Table 활용 권장)
[ ] 페이지네이션 UI 컴포넌트 및 페이징 상태 관리 (`pageIndex`, `pageSize`)
[ ] `CodeViewerModal` 구현 (Monaco Editor ReadOnly 설정)

### S4-13. 설정 모달 (Frontend)
🧾User Story

사용자로서, 어디서든 설정 모달을 열어 내 계정과 환경을 제어하고 싶다.

작업을 중단하지 않고 빠르게 설정을 변경하기 위함이다.

✅ Acceptance Criteria

 LNB의 설정 버튼 클릭 시 모달이 오버레이 형태로 열려야 한다.

 [탭 1: 테마 설정] 라이트/다크 모드 전환 및 Accent Color 선택.

 [탭 2: 장치 관리] 카메라, 마이크, 스피커 장치 선택 및 볼륨 조절, 프리뷰/테스트 기능.

**🛠 Implementation Tasks**
[ ] `SettingsModal` 컴포넌트 및 탭 UI 구현
[ ] `ThemeContext`에 Accent Color 상태 추가
[ ] `useMediaDevices` 훅을 활용한 장치 제어 로직 구현 (Volume, constraints)

### S4-14. 일반 문제 풀이 자동 기록 (Extension)
🧾User Story

사용자로서, 게임이나 스터디가 아닌 혼자 백준 문제를 풀 때도 내 성장에 기록되길 원한다.

우리 서비스 밖에서 푼 문제도 자동으로 스트릭과 티어 점수에 반영하기 위함이다.

✅ Acceptance Criteria

 [컨텍스트 부재] 확장 프로그램에 저장된 특정 Room ID(게임/스터디)가 없을 경우, '일반 제출'로 간주한다.

 [결과 감지] 백준 사이트에서 "맞았습니다!!"가 확인되면 `POST /api/submissions/general` (또는 `/api/solve/{userId}`)을 호출한다.

 [데이터 전송] 요청 Body에는 다음 필수 정보가 포함되어야 한다.
   - `problemId` (필수): 백준 문제 번호 (DB 매핑용)
   - `submissionId` (권장): 백준 제출 ID (중복 적립 방지용)
   - `language`: 사용 언어
   - `code`: 제출한 소스 코드
   - `memory`: 메모리 사용량 (KB)
   - `time`: 실행 시간 (ms)
   - `submittedAt`: 제출 시각

 [성장 반영] 제출 성공 시 내 풀이 목록에 추가되고, 스트릭과 경험치가 즉시 갱신되어야 한다.

**🛠 Implementation Tasks**
[ ] (Extension) 백준 채점 결과 DOM 옵저버 구현 ('맞았습니다!!' 텍스트 감지)
[ ] (Extension) 로컬 스토리지 확인(`currentContext`) 및 일반 제출 API 호출 분기 처리
[ ] 일반 제출 처리 API 구현 (`SubmissionService.handleGeneralSubmission`)
[ ] 제출 정보 저장 시 `problem_title`, `problem_tier`는 DB 조회하여 역정규화 저장
