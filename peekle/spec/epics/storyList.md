
## 📋 Stories

### 00.1. 프로젝트 초기 설정 (Frontend)
**User Story**
> **프론트엔드 개발자**로서, **Tailwind와 Shadcn/UI로 Next.js 프로젝트를 초기화**하고 싶다.
> 팀이 UI 컴포넌트를 구축할 표준 기반을 갖게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] Next.js 15 + TypeScript 프로젝트 구조가 생성되어야 한다.
- [ ] 코드를 커밋할 때 Prettier 및 ESLint (Strict) 규칙이 강제되어야 한다.
- [ ] GitHub Actions에서 main에 푸시하면 빌드 및 린트 검사가 통과해야 한다.

**🛠 Implementation Tasks**
- [ ] `create-next-app`으로 프로젝트 초기화
- [ ] TailwindCSS 및 Shadcn/UI 설치 및 설정
- [ ] Husky 및 lint-staged 설정
- [ ] GitHub Actions workflow 파일 작성 (`build.yml`)

### 00.2. 프로젝트 초기 설정 (Backend)
**User Story**
> **백엔드 개발자**로서, **필요한 의존성으로 Spring Boot 프로젝트를 설정**하고 싶다.
> API 구축을 시작할 수 있어야 하기 때문이다.

**✅ Acceptance Criteria**
- [ ] Spring Boot 3.x 애플리케이션이 성공적으로 실행되어야 한다.
- [ ] `docker-compose up` 실행 시 Redis 컨테이너가 정상 작동해야 한다.
- [ ] 외부 서버에서 제공되는 MySQL 데이터베이스 연결이 성공해야 한다.
- [ ] 전역 에러 처리 및 공통 DTO 패턴이 수립되어야 한다.

**🛠 Implementation Tasks**
- [ ] Spring Initializr로 프로젝트 생성 (Web, JPA, Lombok, Validation)
- [ ] `docker-compose.yml` 작성 (Redis)
- [ ] GlobalExceptionHandler 구현
- [ ] `ApiResponse` 공통 DTO 클래스 작성

### 00.3. Jenkins CI/CD 설정 (DevOps)
**User Story**
> **DevOps 엔지니어**로서, **Jenkins를 배포하고 GitLab 저장소에 연결**하고 싶다.
> 코드 푸시가 자동으로 빌드 및 테스트를 트리거하게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] Jenkins 서버에 접근 가능해야 한다.
- [ ] GitLab 저장소로부터 Push 이벤트를 정상적으로 수신해야 한다.
- [ ] `Jenkinsfile` 파이프라인이 Frontend/Backend에 대해 Build 및 Test 단계를 실행해야 한다.

**🛠 Implementation Tasks**
- [ ] Docker로 Jenkins 컨테이너 배포
- [ ] Jenkins GitLab 플러그인 및 Credential 설정
- [ ] `Jenkinsfile` 작성 (Stage: Checkout -> Build -> Test)

### 00.4. MatterMost 알림 봇 (DevOps)
**User Story**
> **팀원**으로서, **MatterMost에서 빌드 알림**을 받고 싶다.
> 빌드가 실패했는지 즉시 알기 위함이다.

**✅ Acceptance Criteria**
- [ ] MatterMost Incoming Webhook URL이 생성되어야 한다.
- [ ] Jenkins 빌드 성공/실패 시 상태와 링크가 포함된 메시지가 채널에 게시되어야 한다.

**🛠 Implementation Tasks**
- [ ] MatterMost 채널 생성 및 Webhook 설정
- [ ] Jenkins 파이프라인 `post { success/failure }` 블록에 알림 스크립트 추가

### 00.5. WebRTC 인프라 (Coturn) (DevOps)
**User Story**
> **사용자**로서, **내 비디오 트래픽을 릴레이할 TURN 서버**가 필요하다.
> 엄격한 방화벽 뒤에 있어도 스터디 룸에 연결할 수 있어야 하기 때문이다.

**✅ Acceptance Criteria**
- [ ] Coturn 서버가 표준 STUN/TURN 포트에서 수신 대기해야 한다.
- [ ] WebRTC trickle 테스터로 테스트 시 유효한 Relay 후보를 반환해야 한다.
- [ ] OpenVidu 서버가 외부 Coturn 서버를 사용하도록 설정되어야 한다.

**🛠 Implementation Tasks**
- [ ] Coturn Docker 컨테이너 배포 및 `turnserver.conf` 설정
- [ ] OpenVidu 설정 파일(`AWS_URL`, `COTURN_IP`) 업데이트
- [ ] 연결 테스트 수행

## 📋 Stories

### 01.1. 소셜 로그인 UI (Frontend)
**User Story**
> **게스트 사용자**로서, **Google, Naver 또는 Kakao 계정을 사용하여 로그인**하고 싶다.
> 새로운 비밀번호를 기억하지 않고 플랫폼에 액세스하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 로그인 페이지에 "Google로 로그인", "Kakao로 로그인", "Naver로 로그인" 버튼이 노출되어야 한다.
- [ ] 각 버튼 클릭 시 해당 플랫폼의 OAuth 인증 페이지로 리다이렉트되어야 한다.
- [ ] 로그인 성공 콜백 시, 신규 유저는 `/signup`(닉네임 설정), 기존 유저는 `/home`으로 이동해야 한다.

**🛠 Implementation Tasks**
- [ ] 로그인 페이지(`LoginPage.tsx`) UI 구현
- [ ] 각 소셜 버튼 컴포넌트 및 아이콘 추가
- [ ] OAuth 리다이렉트 URL 처리 로직 구현

### 01.2. OAuth2 통합 (Backend)
**User Story**
> **시스템**으로서, **Google/Naver/Kakao를 통해 신원을 확인**하고 싶다.
> 사용자의 이메일 정보를 신뢰하고 간편하게 인증하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 앱 시작 시 OAuth Client ID/Secret이 정상적으로 로드되어야 한다.
- [ ] 제공자(Provider)로부터 액세스 토큰 및 사용자 정보(이메일, 프로필)를 받아와야 한다.
- [ ] DB에 이메일 존재 여부를 확인하여 신규/기존 회원 분기 처리를 해야 한다.

**🛠 Implementation Tasks**
- [ ] Spring Security OAuth2 Client 의존성 추가
- [ ] `application.yml`에 Google, Kakao, Naver 등록 정보 설정
- [ ] `OAuth2UserService` 커스텀 구현 (UserInfo 추출 및 DB 조회)

### 01.3. 닉네임 설정 폼 (Frontend)
**User Story**
> **신규 사용자**로서, **고유한 닉네임을 설정**하고 싶다.
> 커뮤니티에서 나를 식별할 수 있게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 닉네임 입력 시 디바운스(debounce) 처리되어 실시간 중복 확인이 수행되어야 한다.
- [ ] 유효하지 않은 닉네임(특수문자 포함 등) 입력 시 즉시 에러 메시지가 표시되어야 한다.
- [ ] 중복되지 않은 유효한 닉네임일 경우에만 "가입 완료" 버튼이 활성화되어야 한다.

**🛠 Implementation Tasks**
- [ ] 회원가입 페이지(`SignupPage.tsx`) 폼 구현
- [ ] 닉네임 유효성 검사 정규식(Regex) 적용
- [ ] 닉네임 중복 확인 API 연동 (`useDebounce` 훅 활용)

### 01.4. 사용자 관리 API (Backend)
**User Story**
> **클라이언트 애플리케이션**으로서, **사용자를 생성하고 조회하는 API**가 필요하다.
> 회원가입 흐름을 완료하고 사용자 정보를 관리하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `POST /api/v1/users/signup`: 닉네임 업데이트 및 계정 활성화가 수행되어야 한다.
- [ ] `GET /api/v1/users/check-nickname`: 닉네임 사용 가능 여부(Boolean)를 반환해야 한다.
- [ ] 닉네임 중복 시 409 Conflict 에러를 반환해야 한다.

**🛠 Implementation Tasks**
- [ ] `User` 엔티티 설계 (UserRole, Provider 등)
- [ ] `UserRestController` 및 `UserService` 구현
- [ ] 닉네임 중복 체크 쿼리 메소드 작성 (`existsByNickname`)

### 01.5. 확장 프로그램 설치 확인 (Frontend)
**User Story**
> **사용자**로서, **브라우저 확장 프로그램이 설치되어 있는지** 알고 싶다.
> 미설치 시 설치 안내를 받아야 서비스(문제 풀이 감지)를 이용할 수 있기 때문이다.

**✅ Acceptance Criteria**
- [ ] 앱 로드 시 `postMessage`로 확장 프로그램과 핸드셰이크를 시도해야 한다.
- [ ] 응답이 없을 경우, 방 입장 시도 시 "확장 프로그램을 설치해주세요" 모달이 나타나야 한다.
- [ ] 모달에는 크롬 웹 스토어 설치 링크가 포함되어야 한다.

**🛠 Implementation Tasks**
- [ ] `useExtensionCheck` 커스텀 훅 구현
- [ ] 설치 안내 모달 컴포넌트 구현
- [ ] `window.postMessage` 통신 로직 작성

### 01.6. JWT 서비스 & 보안 설정 (Backend)
**User Story**
> **시스템**으로서, **JWT 토큰을 발급하고 검증**하고 싶다.
> 무상태(stateless) 인증을 유지하여 서버 확장성을 확보하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 로그인 성공 시 `JwtTokenProvider`가 Access(단기) 및 Refresh(장기) 토큰을 발급해야 한다.
- [ ] 보안 엔드포인트 요청 시 `JwtAuthenticationFilter`가 헤더의 토큰을 검증해야 한다.
- [ ] Refresh Token으로 Access Token 재발급(Rotate)이 가능해야 한다.

**🛠 Implementation Tasks**
- [ ] `io.jsonwebtoken` 라이브러리 추가
- [ ] `JwtTokenProvider` 클래스 구현 (생성, 검증, 파싱)
- [ ] Spring Security `SecurityFilterChain` 설정 (CSRF 비활성화, 필터 등록)

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

### 03.1. 스터디 레이아웃 및 비디오 그리드 (Frontend)
**User Story**
> **사용자**로서, **효율적인 화면 배치와 참여자들의 상태**를 보고 싶다.
> 문제, IDE, 화상, 채팅을 한 화면에서 끊김 없이 사용하기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[상단 비디오 영역]** 일자(Row) 형태로 배치되며, 내 화면이 맨 왼쪽에 고정되어야 한다.
- [ ] 다른 참여자들은 **최근 발화 순서(Active Speaker)**대로 내 오른쪽으로 정렬되어야 한다.
- [ ] 다른 유저의 비디오를 클릭하면 해당 유저의 **실시간 코드 보기 모드**로 전환되어야 한다.
- [ ] **[초대 및 메뉴]** 상단 우측에 초대 링크 복사 버튼과 햄버거 메뉴(방 설정/나가기)가 있어야 한다.

**🛠 Implementation Tasks**
- [ ] Grid Layout 퍼블리싱 (Left: List, Center: IDE, Right: Chat)
- [ ] OpenVidu Stream 정렬 로직 (Self First + Active Speaker Sort)
- [ ] `useRoomStore`에 `viewingUser` 상태 관리 추가

### 03.2. 문제 목록 및 캘린더 (Left Panel)
**User Story**
> **사용자**로서, **날짜별로 배정된 문제를 확인하고 관리**하고 싶다.
> 스터디 일정에 맞춰 체계적으로 문제를 풀기 위함이다.

**✅ Acceptance Criteria**
- [ ] 달력에서 날짜 선택 시 해당 일자에 추가된 문제 목록이 표시되어야 한다.
- [ ] 문제 추가 시 이름/번호로 검색하여 등록할 수 있어야 한다.
- [ ] 각 문제는 '제목', '풀이 현황(푼 인원/전체 인원)', '내 풀이 여부(Check)'가 표시되어야 한다.
- [ ] **[힌트 버튼]** 클릭 시에만 해당 문제의 티어와 태그가 노출되어야 한다 (기본 숨김).
- [ ] **[남의 코드 보기 버튼]** 클릭 시 모달에 참여자 목록(본인 제외)이 뜨고, 선택 시 해당 유저의 제출 코드를(저장된) 볼 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] `ProblemList` 및 `CalendarWidget` 컴포넌트 구현
- [ ] 문제 검색 및 추가 API 연동
- [ ] `SubmissionViewerModal` 구현 (API `GET /submissions` 조회)

### 03.3. 협업 IDE 및 제출 시스템 (Center Panel)
**User Story**
> **사용자**로서, **코드를 작성하고 백준에 자동으로 제출**하고 싶다.
> IDE에서 작성한 코드를 복사하고 붙여넣는 번거로움을 줄이기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[IDE 설정]** 테마(Dark/White), 언어(C++/Python/Java) 선택이 가능해야 한다.
- [ ] **[제출 버튼 로직]** 클릭 시 다음 프로세스가 순차 실행되어야 한다:
    1. 현재 IDE 코드 클립보드 복사
    2. 확장 프로그램을 통해 백준 문제 페이지 새 탭 오픈
    3. (확장 프로그램) 언어 설정을 선택된 언어로 변경
    4. (확장 프로그램) 코드 붙여넣기 수행
- [ ] **[하단 툴바]** 마이크, 카메라, 스피커 ON/OFF 토글 및 화이트보드, 설정 버튼이 배치되어야 한다.
- [ ] 설정 버튼 클릭 시 `Epic-08`의 설정 모달이 열려야 한다.

**🛠 Implementation Tasks**
- [ ] Monaco Editor 설정 핸들러 구현
- [ ] `SubmissionHandler` 구현 (`window.postMessage` to Extension)
- [ ] 하단 Control Bar 컴포넌트 구현

### 03.4. 화이트보드 시스템 (Overlay)
**User Story**
> **참여자**로서, **화이트보드를 열어 시각적으로 설명**하고 싶다.
> 말로 설명하기 어려운 알고리즘이나 로직을 그림으로 공유하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 한 명이 화이트보드를 오픈하면, 비디오 그리드 왼쪽에 **미리보기 화면**이 생겨야 한다.
- [ ] 미리보기나 툴바의 버튼을 클릭하면 IDE 위에 **화이트보드 오버레이**가 열려야 한다.
- [ ] 다른 사람들은 이 상태에서 IDE를 볼 수 없으며 화이트보드 화면을 공유받아야 한다.

**🛠 Implementation Tasks**
- [ ] Canvas API 또는 화이트보드 라이브러리(Excalidraw 등) 도입
- [ ] WebSocket을 통한 드로잉 데이터 동기화
- [ ] 오버레이 모달 UI 처리

### 03.5. 코드 보기 모드 (Real-time & Saved)
**User Story**
> **사용자**로서, **다른 사람의 코드를(실시간 또는 제출된) 편하게 검토**하고 싶다.
> 코드를 참고하거나 리뷰해주기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[실시간 보기]** 상단 비디오 클릭 또는 참여자 목록 클릭 시:
    - 내 IDE 오른쪽에 대상 유저의 코드가 실시간으로 표시된다 (커서/하이라이팅 포함).
- [ ] **[저장된 코드 보기]** 문제 목록에서 선택 시:
    - 내 IDE 오른쪽에 읽기 전용으로 표시된다 (하이라이팅 X).
- [ ] 남의 코드를 보고 있을 때 **"내 코드만 보기"** 버튼이 활성화되며, 클릭 시 원래대로 돌아와야 한다.
- [ ] **[공유하기 버튼]** 남의 코드를 보는 중 활성화되며, 클릭 시 채팅창이 공유 모드로 전환되어야 한다.

**🛠 Implementation Tasks**
- [ ] Split Editor (Diff Editor 유사 UI) 구현
- [ ] 실시간 코드 동기화 로직 (`CRDT` or `Stomp`)
- [ ] View Mode 상태 관리 (`ONLY_MINE`, `SPLIT_REALTIME`, `SPLIT_SAVED`)

### 03.6. 채팅 및 코드 공유 (Right Panel)
**User Story**
> **사용자**로서, **코드에 대해 채팅으로 소통하고 특정 풀이를 공유**하고 싶다.
> "이 부분 봐주세요"라고 말할 때 정확한 맥락을 전달하기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[채팅창]** 마크다운 렌더링을 지원해야 한다.
- [ ] **[코드 공유]** 공유하기 모드에서 메시지 전송 시, 타 참여자에게 "코드 공유 카드" 형태의 말풍선이 보여야 한다.
- [ ] 공유 카드를 클릭하면 해당 유저의 해당 문제 풀이 뷰로 즉시 이동해야 한다.
- [ ] 채팅 탭과 참여자 목록 탭을 토글할 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] Markdown Parser (`react-markdown`) 적용
- [ ] Chat Message 타입 정의 (`TEXT`, `CODE_SHARE`)
- [ ] 공유 메시지 클릭 핸들러 (View Mode 전환)

### 03.7. 참여자 관리 및 방장 권한 (Right Panel)
**User Story**
> **사용자(및 방장)**로서, **현재 참여 인원을 확인하고 방을 관리**하고 싶다.
> 쾌적한 스터디 환경을 유지하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 참여자 탭 헤더에 현재 인원/최대 인원(예: 3/4)이 표시되어야 한다.
- [ ] 유저는 온라인/오프라인으로 구분되어 리스팅되어야 한다.
- [ ] 온라인 유저 클릭 시 "실시간 코드 보기"가 트리거되어야 한다.
- [ ] **[방장 권한]** 유저 클릭 시 메뉴(Mic/Cam Off, 추방, 권한 위임)가 나와야 한다.
- [ ] 목록 상단의 **"모두 음소거"** 버튼으로 전체 마이크를 끌 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] Participant List 컴포넌트 구현
- [ ] 방장 전용 Control API 연동 (`KICK`, `MUTE_ALL`)
- [ ] Socket 이벤트 핸들러 (`USER_JOIN`, `USER_LEAVE`, `USER_UPDATE`)

### 03.8. 방 관리 (Header Menu)
**User Story**
> **방장**으로서, **방 설정을 변경하거나 방을 삭제**하고 싶다.
> 스터디 운영 정책을 변경하거나 종료하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 햄버거 메뉴 클릭 시 방장은 **[방 설정, 방 삭제]**, 일반 유저는 **[방 나가기]**가 보여야 한다.
- [ ] **[방 설정]** 제목, 공개 여부 등을 수정하는 모달이 떠야 한다.
- [ ] **[방 삭제]** "정말 삭제하시겠습니까?" 경고 모달 후 삭제 처리가 되어야 한다.

**🛠 Implementation Tasks**
- [ ] Room Setting Modal 구현
- [ ] 방 삭제/나가기 API 연동 및 리다이렉트 처리

### 04.1. 게임 로비 & 필터 (Frontend)
**User Story**
> **사용자**로서, **필터를 사용하여 이용 가능한 게임 방을 탐색**하고 싶다.
> 내 티어 수준과 선호하는 모드(개인/팀, 아이템 등)에 맞는 방을 찾기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[게임 모드 탭/필터]** 상단에 4가지 게임 모드 버튼이 있어야 한다:
    - [ ] 개인전/타임어택, 개인전/스피드, 팀전/타임어택, 팀전/스피드
    - [ ] 각 버튼 하단에 간단한 모드 설명 텍스트가 있어야 한다.
    - [ ] 버튼 클릭 시 필터링되며, 재클릭(Toggle) 시 전체 모드로 복귀해야 한다.
- [ ] **[상태 필터]** "전체", "대기중", "진행중"을 선택하는 별도의 필터가 있어야 한다.
- [ ] **[게임 룸 리스트]** 다음 두 종류의 방이 표시되어야 한다:
    1. 현재 "대기 중(Waiting)"인 모든 공개 방
    2. 내가 "참여 중(Playing/Waiting)"인 방 (재접속용)
- [ ] **[방 카드 정보]** 각 카드에는 다음 정보가 포함되어야 한다:
    - [ ] 방 제목, 게임 모드, 인원 현황(현재/최대), 설정 시간, 문제 수
    - [ ] 방장 아이콘 및 닉네임, 현재 참여자들의 아이콘 목록
    - [ ] 잠금 아이콘(비밀번호 방인 경우), 상태 배지(대기중/진행중)
- [ ] **[입장 프로세스]**
    - [ ] 비밀번호 방 클릭 시 입력 모달이 떠야 한다.
    - [ ] 일반 방 클릭 시 즉시 대기실로 입장해야 한다.

**🛠 Implementation Tasks**
- [ ] `GameLobby` 페이지 레이아웃 및 필터 로직 구현
- [ ] `RoomCard` 컴포넌트 구현
- [ ] 방 목록 조회 API (`GET /api/v1/games`) 파라미터 설계 (`type`, `status`)
- [ ] 비밀번호 검증 및 입장 API 연동

### 04.2. 게임 생성 모달 (Frontend)
**User Story**
> **사용자**로서, **3단계 탭을 통해 상세하게 게임을 설정하고 생성**하고 싶다.
> 내가 원하는 난이도와 규칙으로 맞춤형 게임을 즐기기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[탭 1: 방 정보 설정]**
    - [ ] 방 제목 입력 필드가 있어야 한다.
    - [ ] 공개/비공개 토글이 있으며, 비공개 선택 시 비밀번호 입력란이 활성화되어야 한다.
- [ ] **[탭 2: 게임 정보 설정]**
    - [ ] 게임 모드 선택 (개인/팀, 타임어택/스피드)
    - [ ] 최대 인원 설정 (슬라이더)
    - [ ] 제한 시간 설정 (타임어택 모드일 경우 활성화)
    - [ ] 문제 수 설정 (슬라이더)
- [ ] **[탭 3: 문제 출제 범위 설정]** 다음 두 가지 방식 중 하나를 선택해야 한다:
    - [ ] **BOJ 랜덤:**
        - [ ] 티어 범위 슬라이더 (예: Silver 5 ~ Gold 1)
        - [ ] 알고리즘 태그 체크박스 (다중 선택 가능)
    - [ ] **문제집 선택:**
        - [ ] 문제집 검색 기능 제공
        - [ ] "내 북마크 문제집" 목록 제공 및 선택 가능

**🛠 Implementation Tasks**
- [ ] `GameCreationModal` 및 다단계 탭(Stepper) UI 구현
- [ ] `RangeSlider` 컴포넌트 구현 (티어 선택용)
- [ ] 문제집 검색 및 북마크 조회 API 연동

### 04.3. 게임 상태 관리 (Backend)
**User Story**
> **시스템**으로서, **게임 방의 생명주기(State Machine)를 관리**하고 싶다.
> 모든 참여자의 게임 상태(대기 -> 카운트다운 -> 게임 중 -> 종료)를 동기화하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 방 생성 시 상태는 `WAITING`이어야 한다.
- [ ] 방장이 시작 버튼을 누르면 카운트다운 후 `PLAYING` 상태로 전환되어야 한다.
- [ ] `GAME_START` 이벤트 브로드캐스트 시 모든 클라이언트가 게임 화면으로 전환되어야 한다.

**🛠 Implementation Tasks**
- [ ] `GameStatus` Enum 및 State Machine 로직 구현
- [ ] 상태 변경 시 Redis Pub/Sub 메시지 발행 로직
- [ ] 동시성 제어를 위한 락(Lock) 처리

### 04.4. 게임 룸 대기 공간 (Game Room Waiting) (Frontend)
**User Story**
> **참여자(방장/유저)**로서, **게임 시작 전 대기실에서 소통하고 준비 상태를 관리**하고 싶다.
> 팀전일 경우 팀을 전략적으로 선택하고, 모든 인원이 준비된 상태에서 공정하게 게임을 시작하기 위함이다.
> 또한, 친구를 쉽게 초대하여 함께 게임을 즐기고 싶다.

**✅ Acceptance Criteria**
**[공통 기능]**
- [ ] **[방 설정 확인]** 현재 방의 설정(모드, 시간, 문제 수 등)을 확인할 수 있어야 한다.
- [ ] **[참여자 목록]** 현재 방에 접속한 모든 참여자의 목록과 상태(준비/대기)를 볼 수 있어야 한다.
- [ ] **[채팅]** 대기실 내 참여자들과 실시간 채팅을 할 수 있어야 한다.
- [ ] **[초대하기]** 상단의 "초대하기" 버튼 클릭 시 게임 방 링크가 클립보드에 복사되어야 한다.

**[유저 - 공통]**
- [ ] **[준비/취소]** "준비(Ready)" 버튼을 눌러 게임 준비 상태로 전환하거나, 다시 눌러 취소할 수 있어야 한다.

**[유저 - 팀전 모드]**
- [ ] **[팀 선택/이동]** 팀전(Team Mode)일 경우, 원하는 팀(Red/Blue 등)의 빈 슬롯을 클릭하여 자유롭게 팀을 변경/이동할 수 있어야 한다.

**[방장(Host)]**
- [ ] **[게임 시작]** 방장을 제외한 모든 인원이 "준비 완료" 상태일 때만 "게임 시작" 버튼을 눌러 게임을 시작할 수 있다.

**🛠 Implementation Tasks**
- [ ] `WaitingRoom` 레이아웃 구현 (설정 패널, 참여자 리스트, 채팅창, 초대 버튼)
- [ ] `TeamSlot` 컴포넌트 및 팀 이동 로직 (팀전일 경우 활성화)
- [ ] `ChatBox` 컴포넌트 및 Socket.io 채팅 이벤트 연동
- [ ] 초대 링크 복사 기능 (`navigator.clipboard`) 구현
- [ ] 유저 Ready/Unready 상태 관리 로직
- [ ] 방장 Start 버튼 활성/비활성 검증 로직

### 04.5. 게임 플레이 화면 (Game Play Screen) (Frontend)
**User Story**
> **플레이어**로서, **최적화된 IDE 환경에서 문제를 선택하여 풀이**하고 싶다.
> 스터디룸과 유사한 편리한 코딩 환경을 제공받되, 경쟁에 집중할 수 있도록 외부 요소(남의 코드 보기 등)는 제한되기를 원한다.

**✅ Acceptance Criteria**
**[좌측 패널: 문제 목록]**
- [ ] **[문제 리스트]** 현재 게임에 출제된 문제 목록이 표시되어야 한다.
- [ ] **[상태 표시]** 각 문제는 '미해결', '성공' 상태가 아이콘으로 구분되어야 한다.
- [ ] **[선택 및 이동]**
    - [ ] 문제 클릭 시 해당 문제의 코딩 컨텍스트(IDE 탭 등)로 전환되어야 한다.
    - [ ] "문제 보기" 버튼 클릭 시 백준의 해당 문제 페이지가 새 탭으로 열려야 한다.

**[중앙 패널: IDE]**
- [ ] **[언어 선택]** C++, Python, Java, JavaScript 등 원하는 언어를 선택할 수 있어야 한다.
- [ ] **[에디터 기능]** VS Code와 유사한 경험(자동완성, 구문 강조)을 제공해야 한다 (Monaco Editor 권장).
- [ ] **[컨텍스트 유지]** 문제 A를 풀다가 문제 B로 전환해도, 문제 A에 작성하던 코드는 유지되어야 한다.
- [ ] **[제한 사항]** 스터디룸과 달리 **'남의 코드 보기'** 및 **'댓글/채팅'** 기능은 이 화면에서 제공되지 않거나 제한되어야 한다.

**🛠 Implementation Tasks**
- [ ] `GamePlayLayout` 구현 (Left: List, Center: IDE)
- [ ] `IDEContainer` 컴포넌트 재사용 (스터디룸 `Center Panel` 참조하되 기능 토글 처리)
- [ ] 문제별 코드 상태 관리 (`Recoil` or `Zustand` store: `{ problemId: code }`)
- [ ] Monaco Editor 언어 설정 연동

### 04.6. 스코어보드 & 타이머 (Frontend)
**User Story**
> **플레이어**로서, **실시간 점수와 남은 시간**을 보고 싶다.
> 현재 순위를 파악하여 전략적(속도 vs 정확도)으로 플레이하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 상단에 서버 시간과 동기화된 남은 시간이 카운트다운되어야 한다.
- [ ] 누군가 점수를 획득하면 스코어보드가 즉시 갱신되고 재정렬되어야 한다.
- [ ] 점수 정렬 기준은 1순위 점수(내림차순), 2순위 달성 시간(오름차순)이어야 한다.

**🛠 Implementation Tasks**
- [ ] 시간 동기화 훅 (`useServerTime`) 구현
- [ ] `Scoreboard` 컴포넌트 및 리스트 애니메이션 적용

### 04.6. 제출 검증 (Webhook) (Backend)
**User Story**
> **시스템**으로서, **브라우저 확장 프로그램으로부터 풀이 신호**를 받고 싶다.
> 사용자가 백준에서 실제 문제를 해결했음을 검증하고 점수를 부여하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 확장 프로그램의 요청 헤더(토큰)를 검증하여 유효한 사용자인지 확인해야 한다.
- [ ] 제출된 문제 ID가 현재 진행 중인 게임의 목표 문제와 일치하는지 확인해야 한다.
- [ ] 유효한 풀이일 경우 **게임 모드에 따른 점수**를 계산하여 반영해야 한다.
    - [ ] **[개인전]** 상대적 순위 배점: `(전체 인원 - 내 등수 + 1) * 10점`
    - [ ] **[팀전]** 승패 배점: 승리 팀원 각 `30점`, 패배 팀원 각 `10점` (게임 종료 시 일괄 적용 가능)
- [ ] 점수 획득 시 이벤트를 발행하여 클라이언트 스코어보드를 갱신해야 한다.

**🛠 Implementation Tasks**
- [ ] 제출 검증 API (`POST /api/games/submit`) 구현
- [ ] **점수 계산 전략(Strategy Pattern) 구현**
    - [ ] `IndividualScoreStrategy`: `(N - Rank + 1) * 10`
    - [ ] `TeamScoreStrategy`: Win `30`, Lose `10`
- [ ] 보안 인터셉터 구현

### 04.7. 제출 흐름 (Frontend)
**User Story**
> **플레이어**로서, **코드를 제출하고 즉각적인 피드백**을 받고 싶다.
> 점수 획득 여부를 바로 확인하고 다음 행동을 결정하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 에디터의 "제출" 버튼 클릭 시 코드가 클립보드에 복사되고 백준 페이지로 이동하거나 연동되어야 한다.
- [ ] 서버로부터 "정답(SUCCESS)" 메시지를 받으면 화면에 축하 이펙트/토스트가 나타나야 한다.
- [ ] "오답(FAIL)"인 경우 재시도를 독려하는 메시지가 떠야 한다.

**🛠 Implementation Tasks**
- [ ] 제출 버튼 핸들러 및 클립보드 복사 로직
- [ ] 소켓 메시지 리스너(`GAME_RESULT`) 및 Toast UI 구현

### 04.8. Redis 게임 캐시 (Backend)
**User Story**
> **시스템**으로서, **활성 게임 상태를 Redis에 저장**하고 싶다.
> 빈번한 점수 업데이트 트래픽을 처리하고 DB 부하를 최소화하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 게임 진행 중의 점수 및 상태는 Redis(`ZSet`, `Hash`)에서 읽고 써야 한다.
- [ ] 게임 종료 시 Redis의 최종 결과 데이터를 MySQL(`POINT_LOGS` 등)로 영구 저장(Flush)해야 한다.

**🛠 Implementation Tasks**
- [ ] Redis 데이터 구조 설계 (`game:room:{id}:scores`)
- [ ] Write-Back(지연 쓰기) 또는 종료 시점 저장 로직 구현
- [ ] TTL 설정

### 04.9. 게임 결과 모달 (Frontend)
**User Story**
> **플레이어**로서, **게임이 끝난 후 최종 결과**를 보고 싶다.
> 최종 승자, 획득한 포인트, 변경된 내 랭킹 정보를 확인하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 게임 종료 이벤트 수신 시 결과 모달이 오버레이되어야 한다.
- [ ] 1, 2, 3등 사용자에게는 특별한 강조 효과(메달 등)가 있어야 한다.
- [ ] 이번 게임으로 획득한 포인트와 변동된 티어 정보가 표시되어야 한다.

**🛠 Implementation Tasks**
- [ ] `GameResultModal` 컴포넌트 구현
- [ ] 결과 애니메이션(Confetti 등) 적용

### 05.1. 통합 검색 바 (Frontend)
**User Story**
> **사용자**로서, **이름으로 문제, 문제집 또는 사용자를 검색**하고 싶다.
> 원하는 콘텐츠나 사람을 빠르고 정확하게 찾기 위함이다.

**✅ Acceptance Criteria**
- [ ] 검색 바 입력 시 디바운스된 자동 완성 제안 목록이 드롭다운으로 나타나야 한다.
- [ ] 검색 결과 페이지에서 "문제", "사용자", "문제집" 탭으로 결과가 분류되어 표시되어야 한다.
- [ ] 키보드 네비게이션(화살표 키)으로 결과를 선택할 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] `GlobalSearchBar` 컴포넌트 UI 구현
- [ ] `useSearch` 커스텀 훅 (API 호출 및 상태 관리)
- [ ] 검색 결과 하이라이팅 처리

### 05.2. 검색 API 래퍼 (Backend)
**User Story**
> **클라이언트**로서, **단일 엔드포인트로 문제와 사용자를 검색**하고 싶다.
> 프론트엔드 로직을 단순화하고 백엔드에서 검색 전략(DB LIKE vs Vector)을 유연하게 전환하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/search?q={query}` 호출 시 DTO에 문제, 사용자, 문제집 결과를 담아 반환해야 한다.
- [ ] 검색어 타입이나 옵션에 따라 MySQL `LIKE` 검색 또는 Vector DB 검색을 적절히 수행해야 한다.

**🛠 Implementation Tasks**
- [ ] `SearchController` 및 `IntegratedSearchService` 구현
- [ ] 검색 전략 패턴(Strategy Pattern) 구조 설계

### 05.3. 문제집 목록 & 생성 (Left Panel) (Frontend)
**User Story**
> **사용자**로서, **다양한 문제집을 탐색하고 새로운 문제집을 생성**하고 싶다.
> 내 학습 목적에 맞는 문제집을 찾거나, 스터디를 위한 나만의 커리큘럼을 만들기 위함이다.

**✅ Acceptance Criteria**
**[문제집 목록]**
- [ ] **[탭 분류]** "전체", "내 문제집", "북마크한 문제집" 3개의 탭으로 구분되어야 한다.
- [ ] **[정렬]** "최신순", "북마크순" 정렬 옵션을 제공해야 한다.
- [ ] **[생성 버튼]** 상단에 "문제집 생성" 버튼이 노출되어야 한다.

**[문제집 생성]**
- [ ] 생성 버튼 클릭 시 모달이 아닌 인라인 폼 또는 모달이 뜨고, **제목**과 **설명**을 입력하여 생성할 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] `WorkbookList` 컴포넌트 및 정렬 로직 구현
- [ ] `WorkbookCreateForm` 구현

### 05.4. 문제집 상세 & 편집 (Right Panel) (Frontend)
**User Story**
> **사용자**로서, **선택한 문제집의 문제를 확인하고, 필요 시 수정**하고 싶다.
> 문제집 내용을 파악하여 북마크하거나, 내가 만든 문제집의 구성을 업데이트하기 위함이다.

**✅ Acceptance Criteria**
**[문제집 상세]**
- [ ] 좌측에서 선택한 문제집의 상세 정보(제목, 설명)와 포함된 **문제 목록**이 우측 패널에 표시되어야 한다.
- [ ] **[북마크]** 타인의 문제집인 경우 "북마크(가져오기)" 토글 버튼이 있어야 한다.
- [ ] **[편집 버튼]** 내가 만든 문제집인 경우에만 "편집" 버튼이 노출되어야 한다.

**[문제집 편집 (모달)]**
- [ ] 편집 버튼 클릭 시 **편집 전용 모달**이 열려야 한다.
- [ ] **[순서 변경]** 드래그 앤 드롭으로 문제 순서를 변경할 수 있어야 한다.
- [ ] **[문제 삭제]** 목록에서 특정 문제를 삭제할 수 있어야 한다.
- [ ] **[문제 추가]**
    - [ ] 모달 우측에 **문제 검색창**이 있어야 한다.
    - [ ] 이름이나 번호로 검색 시 결과 리스트가 나타나야 한다.
    - [ ] 각 검색 결과에는 "문제 링크(새창)"와 "추가" 버튼이 있어 즉시 문제집에 담을 수 있어야 한다.

**🛠 Implementation Tasks**
- [ ] `WorkbookDetail` 뷰 구현
- [ ] `WorkbookEditModal` 구현 (React DnD, Split Layout)
- [ ] 문제 검색 및 추가 핸들러 구현

### 05.5. 문제집 API (Backend)
**User Story**
> **사용자**로서, **문제집 데이터를 서버에 저장하고 조회**하고 싶다.
> 기기 간 동기화를 보장하고 타인과 공유하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 문제집 메타데이터(제목, 설명)와 포함된 문제 목록(`WORKBOOK_PROBLEMS`)이 정상적으로 저장/수정되어야 한다.
- [ ] `GET /api/v1/workbooks/{id}` 호출 시 로그인한 사용자가 푼 문제인지(Solved 여부)를 마킹하여 반환해야 한다.
- [ ] 문제집 삭제 시 매핑 테이블 데이터도 함께 정리(Cascade)되어야 한다.

**🛠 Implementation Tasks**
- [ ] `Workbook` 관련 Entity, Repository, Service 구현
- [ ] 문제집 상세 조회 시 풀이 상태(`isSolved`) 매핑 로직 구현

### 05.6. 문제 임베딩 파이프라인 (AI)
**User Story**
> **시스템**으로서, **문제 설명을 벡터 임베딩으로 변환**하고 싶다.
> 키워드가 일치하지 않아도 의미적으로 유사한 문제를 찾기 위함이다.

**✅ Acceptance Criteria**
- [ ] 새로운 문제가 추가되면 설명 텍스트를 추출하여 임베딩 모델(text-embedding-3-small)을 통과시켜야 한다.
- [ ] 생성된 벡터 데이터를 Vector DB(ChromaDB)에 인덱싱하여 저장해야 한다.

**🛠 Implementation Tasks**
- [ ] Python AI 서비스(FastAPI) 또는 Java DJL 연동
- [ ] 문제 데이터 전처리 및 임베딩 API 구현
- [ ] Vector DB 연결 및 스키마 설정

### 05.7. 시맨틱 검색 로직 (AI)
**User Story**
> **사용자**으로서, **단순 키워드가 아닌 개념(예: "최단 경로")으로 검색**하고 싶다.
> 문제의 의도나 유형에 맞는 연습 문제를 발견하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 사용자 검색어 쿼리를 벡터로 변환하여 Vector DB에 질의해야 한다.
- [ ] 코사인 유사도(Cosine Similarity)가 높은 상위 K개의 문제를 반환해야 한다.
- [ ] 검색 결과에 유사도 점수나 매칭된 이유가 포함되면 좋다.

**🛠 Implementation Tasks**
- [ ] 시맨틱 검색 Service 로직 구현
- [ ] 검색 결과 랭킹 및 필터링(푼 문제 제외 등) 로직

### 05.8. 추천 엔진 (AI)
**User Story**
> **사용자**로서, **내 티어와 약점에 기반한 "다음 문제" 추천**을 받고 싶다.
> 효율적으로 실력을 향상시키기 위함이다.

**✅ Acceptance Criteria**
- [ ] 사용자가 자주 틀리는 태그(예: DP, 그래프)를 분석하여 유사한 난이도의 문제를 추천해야 한다.
- [ ] 추천 사유 생성: 선정된 후보 문제와 사용자 데이터를 GPT-4o-mini에 전달하여 맞춤형 추천 사유(예: "최근 DP 정답률이 낮아서 추천")를 생성해야 한다.
- [ ] 생성된 결과(문제ID, 추천사유)는 Redis에 저장되어 24시간 동안 유지된다.
- [ ] 이미 푼 문제는 추천 목록에서 제외되어야 한다.

**🛠 Implementation Tasks**
- [ ] 사용자 취약 태그 분석 및 문제 추출: 유저의 최근 오답 기록을 분석하여 취약한 알고리즘 유형을 파악, 이에 맞는 문제를 ChromaDB에서 검색하는 모듈 구현
- [ ] GPT-4o-mini 기반 추천 사유 생성: 선정된 문제와 유저의 학습 상태를 바탕으로 맞춤형 추천 멘트를 생성하는 LLM 기능 구현
- [ ] Redis 결과 저장 및 만료 설정: 생성된 데이터를 Redis에 JSON 형태로 저장하고, 24시간 뒤 자동으로 삭제되도록 TTL 스케줄러 설정


### 06.1. 프로필 UI (Frontend)
**User Story**
> **사용자**로서, **내 프로필 통계를 보고 설정을 관리**하고 싶다.
> 내 정보를 최신 상태로 유지하고 성과를 확인하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 프로필 페이지 상단에 아바타, 닉네임, 현재 티어 배지가 표시되어야 한다.
- [ ] 내 전체 활동 요약(총 풀이 수, 승률 등)이 섹션별로 구분되어야 한다.

**🛠 Implementation Tasks**
- [ ] `ProfilePage` 레이아웃 구현
- [ ] 통계 대시보드 UI 컴포넌트 재사용

### 06.2. 히스토리 조회 API (Backend)
**User Story**
> **사용자**로서, **과거 제출 내역을 목록 형태로 조회**하고 싶다.
> 내가 푼 문제들과 결과를 다시 검토하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/users/{id}/history` 호출 시 페이지네이션된 제출 로그 목록을 반환해야 한다.
- [ ] 역정규화된 `problem_title`, `problem_tier` 정보를 포함하여 추가 조인 없이 효율적으로 조회해야 한다.
- [ ] 날짜별, 결과별(성공/실패) 필터링 옵션을 지원해야 한다.

**🛠 Implementation Tasks**
- [ ] `SubmissionLogRepository` 조회 메소드 작성 (`Pageable` 지원)
- [ ] 동적 쿼리(QueryDSL) 적용 (필터링 용)

### 06.3. 히스토리 목록 & 코드 뷰어 (Frontend)
**User Story**
> **사용자**로서, **과거에 푼 문제의 소스 코드를 다시** 보고 싶다.
> 내 풀이 방식을 복기하거나 개선점을 찾기 위함이다.

**✅ Acceptance Criteria**
- [ ] 히스토리 목록 테이블에 날짜, 문제 이름, 결과(성공여부), 사용 언어, 실행 시간이 표시되어야 한다.
- [ ] 특정 행을 클릭하면 모달이 열리고, 당시 제출했던 코드가 읽기 전용 에디터에 로드되어야 한다.
- [ ] 코드 복사 버튼이 제공되어야 한다.

**🛠 Implementation Tasks**
- [ ] `SubmissionTable` 컴포넌트 구현 (TanStack Table 활용 권장)
- [ ] `CodeViewerModal` 구현 (Monaco Editor ReadOnly 설정)

### 06.4. 확장 프로그램 보안 API (Backend)
**User Story**
> **시스템**으로서, **확장 프로그램 전용 토큰을 발급하고 검증**하고 싶다.
> 외부에서 들어오는 제출 신호가 조작되지 않았음을 보장하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `POST /api/v1/users/extension-token` 요청 시 랜덤 UUID 토큰을 생성하여 반환해야 한다.
- [ ] DB에는 토큰 원문이 아닌 해시값(SHA-256 등)만 저장해야 한다.
- [ ] 확장 프로그램 요청 인터셉터에서 헤더의 토큰과 DB의 해시를 대조하여 유효성을 검증해야 한다.

**🛠 Implementation Tasks**
- [ ] 토큰 생성 및 해싱 유틸리티 구현
- [ ] `ExtensionAuthInterceptor` 구현
- [ ] 사용자 엔티티에 토큰 해시 필드 추가


### 07.1. 리그 랭킹 테이블 (Frontend)
**User Story**
> **사용자**로서, **내 리그 그룹(20명) 내에서 내 위치**를 보고 싶다.
> 승급 가능권인지 강등 위험권인지 파악하여 경쟁심을 갖기 위함이다.
> 또한, **나의 역대 최고 도달 리그**를 확인하여 성취감을 느끼고 싶다.

**✅ Acceptance Criteria**
- [ ] 리그 페이지 진입 시 현재 내가 속한 그룹의 랭킹 테이블을 보여주어야 한다.
- [ ] 랭킹 포인트(LP) 순으로 정렬되어야 하며, 내 행(Row)은 시각적으로 강조되어야 한다.
- [ ] 승급권(상위권)과 강등권(하위권)을 구분하는 시각적 가이드라인(구분선, 배경색 등)이 표시되어야 한다.
- [ ] **[최고 기록]** 사용자 정보 영역에 "최고 도달 리그(Max League)"가 뱃지나 텍스트로 표시되어야 한다.

**🛠 Implementation Tasks**
- [ ] `LeagueRankingTable` 컴포넌트 구현
- [ ] 내 순위 하이라이팅 CSS 적용
- [ ] 승급/강등 라인 렌더링 로직
- [ ] 최고 티어 표시 UI 추가

### 07.2. 리그 조회 API (Backend)
**User Story**
> **클라이언트**로서, **현재 사용자의 리그 그룹 데이터**를 조회하고 싶다.
> 랭킹 테이블 UI를 구성하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/leagues/me` 호출 시 사용자의 `league_group_id`에 속한 모든 멤버 목록을 반환해야 한다.
- [ ] 응답에는 순위, 유저 기본 정보(닉네임, 프로필, **Max League**)와 현재 포인트가 포함되어야 한다.
- [ ] Redis 캐시(`ZSet`)를 우선 조회하고 없을 경우 DB에서 조회하여 응답 속도를 최적화해야 한다.
- [ ] **[DB 스키마]** `Users` 테이블에 `max_league` 컬럼을 추가하여 관리해야 한다.

**🛠 Implementation Tasks**
- [ ] `LeagueService` 랭킹 조회 로직 구현
- [ ] Redis 캐싱 전략(Look-aside) 적용
- [ ] User Entity `max_league` 필드 추가 및 갱신 로직 (승급 시 체크)

### 07.3. 티어 분포 그래프 (Frontend)
**User Story**
> **사용자**로서, **전체 사용자의 티어별 분포**를 보고 싶다.
> 전체 생태계에서 나의 객관적인 위치를 파악하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 브론즈부터 다이아몬드까지 각 티어에 속한 인원수를 막대 차트(Bar Chart)로 시각화해야 한다.
- [ ] 내가 속한 티어의 막대는 다른 색상으로 강조되어야 한다.

**🛠 Implementation Tasks**
- [ ] `TierDistributionChart` 컴포넌트 구현
- [ ] 전체 통계 조회 API 연동

### 07.4. 리그 스케줄러 (배치) (Backend)
**User Story**
> **시스템**으로서, **매주 수요일 새벽에 리그 승급/강등을 일괄 처리**하고 싶다.
> 새로운 시즌(주차)을 시작하고 리그 생태계를 순환시키기 위함이다.

**✅ Acceptance Criteria**
- [ ] 매주 수요일 06:00 (KST)에 `LeagueScheduler`가 실행되어야 한다 (`@Scheduled`).
- [ ] 배치 작업은 다음 순서로 원자적(Atomic)으로 수행되어야 한다: 스냅샷 생성 -> 승급/강등 계산 -> 유저 정보 업데이트 -> Redis 랭킹 리셋.
- [ ] 승급/강등 규칙은 `LeagueTier` Enum에 정의된 값을 따라야 한다.

**🛠 Implementation Tasks**
- [ ] Spring Batch Job 설정 및 Step 구성
- [ ] `LeagueTier` Enum 규칙 적용 로직 구현
- [ ] 트랜잭션 범위 설정 및 예외 처리

### 08.1. 글로벌 앱 쉘 (LNB) (Frontend)
**User Story**
> **사용자**로서, **지속적인 좌측 네비게이션 바(LNB)**를 원한다.
> 주요 기능 간의 빠른 이동과 내 핵심 정보를 항상 확인하기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[상단 프로필 영역]** 사용자 아바타, 닉네임, 리그 아이콘, 리그명, 현재 점수, 순위, 승급/강등 상태가 표시되어야 한다.
- [ ] **[중단 네비게이션 영역]** 메인, 스터디방, 게임방, 문제집, 스터디 랭킹, 리그, 검색 버튼이 순서대로 배치되어야 한다.
- [ ] **[하단 설정 영역]** 최하단에 설정 버튼이 위치하며, 클릭 시 설정 모달이 열려야 한다.
- [ ] 현재 라우트 경로에 따라 해당 메뉴 아이콘이 강조(Active state)되어야 한다. (데스크탑 기준 고정)

**🛠 Implementation Tasks**
- [ ] `Sidebar` 컴포넌트 레이아웃 구현 (Flex/Grid)
- [ ] `SidebarItem` 컴포넌트 및 Active 상태 로직 (`usePathname`)
- [ ] 프로필 정보 조회 및 상태 바인딩

### 08.2. 설정 모달 (Frontend)
**User Story**
> **사용자**로서, **어디서든 설정 모달을 열어** 내 계정과 환경을 제어하고 싶다.
> 작업을 중단하지 않고 빠르게 설정을 변경하기 위함이다.

**✅ Acceptance Criteria**
- [ ] LNB의 설정 버튼 클릭 시 모달이 오버레이 형태로 열려야 한다.
- [ ] **[탭 1: 테마 설정]**
    - [ ] 라이트/다크 모드 전환 스위치가 있어야 한다.
    - [ ] 앱 전반에 적용될 Accent Color(예: Blue, Purple, Green)를 선택할 수 있어야 한다.
- [ ] **[탭 2: 장치 관리]**
    - [ ] 카메라, 마이크, 스피커 장치 선택 드롭다운이 제공되어야 한다.
    - [ ] 카메라 해상도(480p, 720p, 1080p)를 조정하는 슬라이더 또는 선택기가 있어야 한다.
    - [ ] 마이크 및 스피커 볼륨 조절 슬라이더가 있어야 한다.
    - [ ] 실시간 카메라 미리보기와 마이크 입력 레벨 미터(Visualizer)가 동작해야 한다.
    - [ ] "스피커 테스트" 버튼 클릭 시 테스트 음이 재생되어야 한다.
- [ ] 모달 바깥 영역 클릭 시 닫혀야 한다.

**🛠 Implementation Tasks**
- [ ] `SettingsModal` 컴포넌트 및 탭 UI 구현
- [ ] `ThemeContext`에 Accent Color 상태 추가
- [ ] `useMediaDevices` 훅을 활용한 장치 제어 로직 구현 (Volume, constraints)


### 09.1. 스터디 랭킹 보드 (Frontend)
**User Story**
> **사용자**로서, **전체 스터디 그룹 중 상위 그룹과 전체 순위**를 보고 싶다.
> 어떤 스터디가 가장 활발하게 활동하는지 파악하고 경쟁심을 느끼기 위함이다.

**✅ Acceptance Criteria**
- [ ] **[Top 3 강조]** 랭킹 1, 2, 3위 스터디는 상단에 별도로 강조된 카드(메달, 트로피 등)로 표시되어야 한다.
- [ ] **[리스트 뷰]** 4위부터는 하단에 리스트 형태로 표시되어야 한다.
- [ ] **[페이지네이션]** 한 페이지당 20개의 스터디 팀이 표시되어야 하며, 하단에 페이지네이션 컨트롤이 있어야 한다.
- [ ] 각 항목에는 순위, 스터디 이름, 팀장(대표) 닉네임, 총 `ranking_point`가 포함되어야 한다.

**🛠 Implementation Tasks**
- [ ] `StudyRankingBoard` 페이지 레이아웃 구현
- [ ] `TopThreePodium` 컴포넌트 구현
- [ ] `StudyRankingList` 컴포넌트 및 페이지네이션 로직

### 09.2. 스터디 랭킹 상세 및 기여도 (Frontend)
**User Story**
> **사용자**로서, **특정 스터디를 클릭했을 때 멤버들의 기여도**를 보고 싶다.
> 팀 내에서 누가 점수를 많이 획득했는지 확인하고, 해당 멤버의 프로필로 이동하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 랭킹 리스트에서 스터디 클릭 시 상세 모달 또는 Drawer가 열려야 한다.
- [ ] **[멤버 기여도]** 해당 스터디의 모든 멤버와 각 멤버가 기여한 점수가 내림차순으로 정렬되어야 한다.
- [ ] **[프로필 이동]** 멤버 리스트에서 유저 클릭 시 해당 유저의 **프로필 페이지(Epic-06)**로 이동해야 한다.

**🛠 Implementation Tasks**
- [ ] `StudyDetailModal` 구현
- [ ] 멤버별 기여 점수 조회 API 연동
- [ ] 프로필 라우팅 처리

### 09.3. 스터디 랭킹 조회 API (Backend)
**User Story**
> **클라이언트**로서, **정렬된 스터디 랭킹 데이터와 상세 정보**를 조회하고 싶다.
> 랭킹 페이지와 상세 모달을 구성하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/studies/ranking` 호출 시 `ranking_point` 내림차순으로 페이징된 스터디 목록을 반환해야 한다.
- [ ] `GET /api/v1/studies/{id}/members` 호출 시 해당 스터디 멤버 목록을 반환해야 한다.

**🛠 Implementation Tasks**
- [ ] `StudyRankingService` 구현
- [ ] JPA 또는 Native SQL을 이용한 랭킹 정렬 및 페이징 쿼리 작성
- [ ] 스터디 멤버 단순 조회 API 구현
