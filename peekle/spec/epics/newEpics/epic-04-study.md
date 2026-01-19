# Epic-05: 스터디원으로서, 실시간으로 소통하며 코드를 공유하고 함께 공부하고 싶다

## 📌 Overview
이 문서는 WebRTC 기반의 실시간 스터디 룸 기능을 정의합니다. 사용자는 스터디를 찾아서 입장하거나 직접 개설할 수 있으며, 참여자들은 화상 채팅과 동시에 협업 IDE, 화이트보드, 실시간 코드 공유 기능을 활용하여 원격에서도 마치 옆에 있는 것처럼 함께 학습할 수 있습니다.

## 📋 Stories

### S5-1. 나의 스터디 목록 및 검색 (Frontend)
🧾User Story

사용자로서, 내가 참여 중인 스터디 방 목록을 조회하고 검색하고 싶다.

내가 활동 중인 스터디에 빠르게 접근하기 위함이다.

✅ Acceptance Criteria

 [목록 조회] 기본적으로 모든 스터디는 비공개이며, 목록에는 내가 이미 참여한 스터디만 표시되어야 한다.

 [스터디 카드 정보] 각 카드에는 다음 정보가 표시되어야 한다.
   - 방 제목, 설명
   - 총 참여 인원 수
   - 스터디 그룹 랭킹 포인트 (점수)
   - 방장 프로필 이미지 및 닉네임, 내가 방장인지 여부(뱃지 등)
   - 현재 온라인인 참여자들의 프로필 이미지 목록 (Avatar Pile)

 [검색] 상단 검색창을 통해 "내 목록 내에서" 스터디 제목으로 검색(필터링)할 수 있어야 한다.

 [화면 구성] 상단에 '참여하기(코드 입력)', '방 만들기' 버튼이 있고, 하단에 스터디 카드 그리드가 배치된다.

 [입장] 리스트의 카드를 클릭하면 즉시 해당 스터디 룸(장치 설정 화면)으로 이동한다.

**🛠 Implementation Tasks**
[ ] `MyStudyList` 페이지 레이아웃 및 카드 UI 구현
[ ] 내 스터디 목록 조회 API 연동 (`GET /api/studies/me`)
[ ] 클라이언트 사이드 필터링(검색) 로직
[ ] 스터디 카드 컴포넌트(`StudyCard`) 세부 정보 바인딩

### S5-2. 스터디 참여 (코드 입력) (Frontend)
🧾User Story

사용자로서, 초대 코드를 입력하여 새로운 스터디에 합류하고 싶다.

지인이나 커뮤니티를 통해 공유받은 비공개 스터디에 참여하기 위함이다.

✅ Acceptance Criteria

 [참여 모달] "참여하기" 버튼 클릭 시 6자리(또는 UUID) 초대 코드 입력 모달이 열려야 한다.

 [유효성 검사] 코드 입력 후 확인 시 서버에서 방 존재 여부를 확인한다. (정원 제한 없음)

 [참여 완료] 검증 성공 시 내 스터디 목록에 추가되고, 해당 스터디 메인으로 이동하거나 목록이 갱신되어야 한다.

**🛠 Implementation Tasks**
[ ] `JoinStudyModal` 컴포넌트 구현
[ ] 스터디 참여 API 연동 (`POST /api/studies/join`)
[ ] 에러 핸들링 (유효하지 않은 코드 등)

### S5-3. 스터디 생성 (Frontend)
🧾User Story

사용자로서, 새로운 스터디 방을 개설하고 싶다.

내가 원하는 주제로 지인들과 함께 공부할 공간을 만들기 위함이다.

✅ Acceptance Criteria

 [생성 모달] "방 만들기" 버튼 클릭 시 생성 폼이 열려야 한다.

 [입력 항목] 방 제목과 설명을 입력할 수 있어야 한다. (정원 설정 없음)

 [생성 후 이동] 생성 완료 시 즉시 방에 참여 상태가 되며, 해당 방으로 입장해야 한다.

**🛠 Implementation Tasks**
[ ] `CreateStudyModal` 컴포넌트 구현 (Title, Description Input)
[ ] 스터디 생성 API 연동 (`POST /api/studies`)
[ ] 생성된 방의 초대 코드 생성 및 표시 로직 (방 내부에서)

### S5-4. 스터디 레이아웃 및 비디오 그리드 (Frontend)
🧾User Story

사용자로서, 효율적인 화면 배치와 참여자들의 상태를 보고 싶다.

문제, IDE, 화상, 채팅을 한 화면에서 끊김 없이 사용하기 위함이다.

✅ Acceptance Criteria

 [상단 비디오 영역] 일자(Row) 형태로 배치되며, 내 화면이 맨 왼쪽에 고정되어야 한다.

 다른 참여자들은 [최근 발화 순서(Active Speaker)]대로 내 오른쪽으로 정렬되어야 한다.

 다른 유저의 비디오를 클릭하면 해당 유저의 [실시간 코드 보기 모드]로 전환되어야 한다.

 [초대 및 메뉴] 상단 우측에 [초대 코드 복사] 버튼과 햄버거 메뉴(방 설정/나가기)가 있어야 한다.

**🛠 Implementation Tasks**
[ ] Grid Layout 퍼블리싱 (Left: List, Center: IDE, Right: Chat)
[ ] OpenVidu Stream 정렬 로직 (Self First + Active Speaker Sort)
[ ] `useRoomStore`에 `viewingUser` 상태 관리 추가

### S5-5. 문제 목록 및 캘린더 (Left Panel)
🧾User Story

사용자로서, 날짜별로 배정된 문제를 확인하고 관리하고 싶다.

스터디 일정에 맞춰 체계적으로 문제를 풀기 위함이다.

✅ Acceptance Criteria

 달력에서 날짜 선택 시 해당 일자에 추가된 문제 목록이 표시되어야 한다.

 문제 추가 시 이름/번호로 검색하여 등록할 수 있어야 한다.

 각 문제는 '제목', '풀이 현황(푼 인원)', '내 풀이 여부(Check)'가 표시되어야 한다. (전체 인원 분모 제거)

 [힌트/남의 코드 보기] 버튼을 통해 티어 힌트를 보거나 제출된 동료들의 코드를 열람할 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] `ProblemList` 및 `CalendarWidget` 컴포넌트 구현
[ ] 문제 검색 및 추가 API 연동
[ ] `SubmissionViewerModal` 구현 (API `GET /submissions` 조회)

### S5-6. 협업 IDE 및 제출 시스템 (Center Panel)
🧾User Story

사용자로서, 코드를 작성하고 백준에 자동으로 제출하고 싶다.

IDE에서 작성한 코드를 복사하고 붙여넣는 번거로움을 줄이기 위함이다.

✅ Acceptance Criteria

 [IDE 설정] 테마, 언어 선택(C++/Python/Java)이 가능해야 한다.

 [제출 버튼] 클릭 시 현재 코드가 클립보드에 복사되고, 확장 프로그램을 트리거하여 백준 페이지에 코드를 붙여넣어야 한다.

 [하단 툴바] 미디어 제어(Mic/Cam/Speaker), 화이트보드, 설정 버튼이 접근 가능해야 한다.

**🛠 Implementation Tasks**
[ ] Monaco Editor 설정 핸들러 구현
[ ] `SubmissionHandler` 구현 (`window.postMessage` to Extension)
[ ] 하단 Control Bar 컴포넌트 구현

### S5-7. 화이트보드 시스템 (Overlay)
🧾User Story

참여자로서, 화이트보드를 열어 시각적으로 설명하고 싶다.

말로 설명하기 어려운 알고리즘이나 로직을 그림으로 공유하기 위함이다.

✅ Acceptance Criteria

 한 명이 화이트보드를 오픈하면, 비디오 그리드 왼쪽에 [미리보기 화면]이 생겨야 한다.

 클릭 시 IDE 위에 [화이트보드 오버레이]가 열리고, 모든 참여자에게 드로잉이 실시간 동기화되어야 한다.

**🛠 Implementation Tasks**
[ ] Canvas API 또는 화이트보드 라이브러리(Excalidraw 등) 도입
[ ] WebSocket을 통한 드로잉 데이터 동기화
[ ] 오버레이 모달 UI 처리

### S5-8. 코드 보기 모드 (Real-time & Saved)
🧾User Story

사용자로서, 다른 사람의 코드를(실시간 또는 제출된) 편하게 검토하고 싶다.

코드를 참고하거나 리뷰해주기 위함이다.

✅ Acceptance Criteria

 [실시간 보기] 특정 유저 선택 시, 내 IDE 오른쪽에 대상 유저의 코드가 실시간으로 표시된다(Split View).

 [저장된 코드 보기] 문제 목록에서 선택 시, 해당 유저의 최종 제출 코드가 읽기 전용으로 표시된다.

 "내 코드만 보기" 버튼으로 언제든지 복귀할 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] Split Editor (Diff Editor 유사 UI) 구현
[ ] 실시간 코드 동기화 로직 (`CRDT` or `Stomp`)
[ ] View Mode 상태 관리 (`ONLY_MINE`, `SPLIT_REALTIME`, `SPLIT_SAVED`)

### S5-9. 채팅 및 코드 공유 (Right Panel)
🧾User Story

사용자로서, 코드에 대해 채팅으로 소통하고 특정 풀이를 공유하고 싶다.

"이 부분 봐주세요"라고 말할 때 정확한 맥락을 전달하기 위함이다.

✅ Acceptance Criteria

 [채팅창] 마크다운 렌더링을 지원해야 한다.

 [코드 공유] 공유하기 모드에서 메시지 전송 시, 클릭 가능한 "코드 공유 카드"가 전송되어야 한다.

 카드를 클릭한 다른 유저들은 즉시 공유자의 해당 코드 뷰로 이동해야 한다.

**🛠 Implementation Tasks**
[ ] Markdown Parser (`react-markdown`) 적용
[ ] Chat Message 타입 정의 (`TEXT`, `CODE_SHARE`)
[ ] 공유 메시지 클릭 핸들러 (View Mode 전환)

### S5-10. 참여자 관리 및 방장 권한 (Right Panel)
🧾User Story

사용자(및 방장)로서, 현재 참여 인원을 확인하고 방을 관리하고 싶다.

쾌적한 스터디 환경을 유지하기 위함이다.

✅ Acceptance Criteria

 참여자 목록에 온라인/오프라인 상태가 표시되어야 한다. (현재 인원 수 표시)

 [방장 권한] 유저 강퇴, 권한 위임, 전체 음소거(Mute All) 기능을 사용할 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] Participant List 컴포넌트 구현
[ ] 방장 전용 Control API 연동 (`KICK`, `MUTE_ALL`)
[ ] Socket 이벤트 핸들러 (`USER_JOIN`, `USER_LEAVE`, `USER_UPDATE`)

### S5-11. 방 관리 (Header Menu)
🧾User Story

방장으로서, 방 설정을 변경하거나 방을 삭제하고 싶다.

스터디 운영 정책을 변경하거나 종료하기 위함이다.

✅ Acceptance Criteria

 방장은 방 제목, [설명] 등을 수정하거나 방을 삭제할 수 있어야 한다.

 일반 유저는 "방 나가기" 기능을 사용할 수 있다.

**🛠 Implementation Tasks**
[ ] Room Setting Modal 구현
[ ] 방 삭제/나가기 API 연동 및 리다이렉트 처리
