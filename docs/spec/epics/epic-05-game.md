# Epic-06: 플레이어로서, 다양한 모드의 코딩 게임을 통해 실력을 겨루고 싶다

## 📌 Overview
이 문서는 개인전, 팀전 및 타임어택 등 다양한 규칙으로 진행되는 코딩 게임 시스템을 정의합니다. 대기실에서의 팀 구성부터 실시간 문제 풀이 경쟁, 그리고 최종 스코어보드까지의 흐름을 포함합니다.

## 📋 Stories

### S6-1. 게임 로비 & 필터 (Frontend)
🧾User Story

사용자로서, 필터를 사용하여 이용 가능한 게임 방을 탐색하고 싶다.

내 티어 수준과 선호하는 모드(개인/팀, 아이템 등)에 맞는 방을 찾기 위함이다.

✅ Acceptance Criteria

 게임 모드(개인/팀, 타임어택/스피드) 및 상태(대기/진행) 필터링 UI가 제공되어야 한다.

 대기 중인 방과 내가 참여 중인 방이 리스트 카드 형태로 표시되어야 한다.

 비밀번호 방 입장 시 검증 모달이 표시되어야 한다.

**🛠 Implementation Tasks**
[ ] `GameLobby` 페이지 레이아웃 및 필터 로직 구현
[ ] `RoomCard` 컴포넌트 구현
[ ] 방 목록 조회 API (`GET /api/v1/games`) 파라미터 설계 (`type`, `status`)
[ ] 비밀번호 검증 및 입장 API 연동

### S6-2. 게임 생성 모달 (Frontend)
🧾User Story

사용자로서, 3단계 탭을 통해 상세하게 게임을 설정하고 생성하고 싶다.

내가 원하는 난이도와 규칙으로 맞춤형 게임을 즐기기 위함이다.

✅ Acceptance Criteria

 [설정 탭] 방 제목, 공개 여부, 게임 모드, 인원, 시간 등을 설정한다.

 [문제 출제] BOJ 랜덤(티어/태그 지정) 또는 내 문제집 기반 출제를 선택할 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] `GameCreationModal` 및 다단계 탭(Stepper) UI 구현
[ ] `RangeSlider` 컴포넌트 구현 (티어 선택용)
[ ] 문제집 검색 및 북마크 조회 API 연동

### S6-3. 게임 상태 관리 (Backend)
🧾User Story

시스템으로서, 게임 방의 생명주기(State Machine)를 관리하고 싶다.

모든 참여자의 게임 상태(대기 -> 카운트다운 -> 게임 중 -> 종료)를 동기화하기 위함이다.

✅ Acceptance Criteria

 방 생성(`WAITING`) -> 시작(`PLAYING`) -> 종료(`FINISHED`) 상태 전이를 관리해야 한다.

 Redis Pub/Sub을 통해 상태 변경 이벤트를 실시간으로 브로드캐스트해야 한다.

**🛠 Implementation Tasks**
[ ] `GameStatus` Enum 및 State Machine 로직 구현
[ ] 상태 변경 시 Redis Pub/Sub 메시지 발행 로직
[ ] 동시성 제어를 위한 락(Lock) 처리

### S6-4. 게임 룸 대기 공간 (Frontend)
🧾User Story

참여자로서, 게임 시작 전 대기실에서 팀을 정하고 준비하고 싶다.

전략적으로 팀을 구성하고 공정하게 시작하기 위함이다.

✅ Acceptance Criteria

 [팀전] Red/Blue 팀 슬롯을 클릭하여 자유롭게 이동할 수 있다.

 [준비] 유저는 Ready 버튼을 눌러야 하며, 방장은 전원 Ready 시에만 Start 할 수 있다.

 채팅 및 초대 링크 복사 기능이 제공되어야 한다.

**🛠 Implementation Tasks**
[ ] `WaitingRoom` 레이아웃 구현 (설정 패널, 참여자 리스트, 채팅창, 초대 버튼)
[ ] `TeamSlot` 컴포넌트 및 팀 이동 로직 (팀전일 경우 활성화)
[ ] `ChatBox` 컴포넌트 및 Socket.io 채팅 이벤트 연동
[ ] 초대 링크 복사 기능 (`navigator.clipboard`) 구현
[ ] 유저 Ready/Unready 상태 관리 로직
[ ] 방장 Start 버튼 활성/비활성 검증 로직

### S6-5. 게임 플레이 화면 (Frontend)
🧾User Story

플레이어로서, 최적화된 IDE 환경에서 문제를 선택하여 풀이하고 싶다.

경쟁에 집중할 수 있도록 외부 방해 요소를 차단하고 문제 풀이에만 몰입하기 위함이다.

✅ Acceptance Criteria

 [좌측] 출제된 문제 리스트와 내 해결 상태(성공/미해결) 표시.

 [중앙] Monaco Editor 기반 IDE. (타인 코드 보기, 채팅 등은 제한됨)

 문제 클릭 시 해당 문제의 컨텍스트로 IDE가 전환되어야 한다.

**🛠 Implementation Tasks**
[ ] `GamePlayLayout` 구현 (Left: List, Center: IDE)
[ ] `IDEContainer` 컴포넌트 재사용 (스터디룸 `Center Panel` 참조하되 기능 토글 처리)
[ ] 문제별 코드 상태 관리 (`Recoil` or `Zustand` store: `{ problemId: code }`)
[ ] Monaco Editor 언어 설정 연동

### S6-6. 스코어보드 & 타이머 (Frontend)
🧾User Story

플레이어로서, 실시간 점수와 남은 시간을 보고 싶다.

현재 순위를 파악하여 전략적(속도 vs 정확도)으로 플레이하기 위함이다.

✅ Acceptance Criteria

 상단에 남은 시간이 카운트다운된다.

 점수 획득 시 스코어보드가 즉시 갱신되며, 점수 내림차순 > 시간 오름차순으로 자동 정렬된다.

**🛠 Implementation Tasks**
[ ] 시간 동기화 훅 (`useServerTime`) 구현
[ ] `Scoreboard` 컴포넌트 및 리스트 애니메이션 적용

### S6-7. 제출 검증 (Webhook) (Backend)
🧾User Story

시스템으로서, 브라우저 확장 프로그램으로부터 풀이 신호를 받고 싶다.

사용자가 백준에서 실제 문제를 해결했음을 검증하고 점수를 부여하기 위함이다.

✅ Acceptance Criteria

 확장 프로그램 헤더 토큰 검증 및 백준 문제 ID 일치 여부 확인.

 [점수 계산] 개인전(순위별 차등), 팀전(승/패) 전략에 따라 점수를 부여한다.

 점수 변동 시 클라이언트에 이벤트를 발행한다.

**🛠 Implementation Tasks**
[ ] 제출 검증 API (`POST /api/games/submit`) 구현
[ ] **점수 계산 전략(Strategy Pattern) 구현**
    - [ ] `IndividualScoreStrategy`: `(N - Rank + 1) * 10`
    - [ ] `TeamScoreStrategy`: Win `30`, Lose `10`
[ ] 보안 인터셉터 구현

### S6-8. 제출 흐름 (Frontend)
🧾User Story

플레이어로서, 코드를 제출하고 즉각적인 피드백을 받고 싶다.

점수 획득 여부를 바로 확인하고 다음 행동을 결정하기 위함이다.

✅ Acceptance Criteria

 "제출" 버튼 클릭 시 클립보드 복사 및 백준 이동.

 서버로부터 결과(SUCCESS/FAIL) 수신 시 토스트 메시지 및 이펙트 표시.

**🛠 Implementation Tasks**
[ ] 제출 버튼 핸들러 및 클립보드 복사 로직
[ ] 소켓 메시지 리스너(`GAME_RESULT`) 및 Toast UI 구현

### S6-9. Redis 게임 캐시 (Backend)
🧾User Story

시스템으로서, 활성 게임 상태를 Redis에 저장하고 싶다.

빈번한 점수 업데이트 트래픽을 처리하고 DB 부하를 최소화하기 위함이다.

✅ Acceptance Criteria

 게임 진행 데이터는 Redis(`ZSet`)에서 관리하고, 종료 시점에만 DB에 영구 저장(Write-Back)한다.

**🛠 Implementation Tasks**
[ ] Redis 데이터 구조 설계 (`game:room:{id}:scores`)
[ ] Write-Back(지연 쓰기) 또는 종료 시점 저장 로직 구현
[ ] TTL 설정

### S6-10. 게임 결과 모달 (Frontend)
🧾User Story

플레이어로서, 게임이 끝난 후 최종 결과를 보고 싶다.

최종 승자, 획득한 포인트, 변경된 내 랭킹 정보를 확인하기 위함이다.

✅ Acceptance Criteria

 게임 종료 시 결과 모달이 오버레이된다.

 1, 2, 3위 입상자 강조 및 획득 포인트, 변동된 내 티어 정보가 표시되어야 한다.

**🛠 Implementation Tasks**
[ ] `GameResultModal` 컴포넌트 구현
[ ] 결과 애니메이션(Confetti 등) 적용
