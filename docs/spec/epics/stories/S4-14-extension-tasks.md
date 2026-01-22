# S4-14. 일반 문제 풀이 자동 기록 (Extension)

## 🧾 User Story
**사용자로서**, 게임이나 스터디가 아닌 혼자 백준 문제를 풀 때도 내 성장에 기록되길 원한다.
**우리 서비스 밖에서 푼 문제도 자동으로 스트릭과 티어 점수에 반영하기 위함이다.**

## ✅ Acceptance Criteria
- **[컨텍스트 부재]** 확장 프로그램에 저장된 특정 Room ID(게임/스터디)가 없을 경우, '일반 제출'로 간주한다.
- **[결과 감지]** 백준 사이트에서 "맞았습니다!!"가 확인되면 `POST /api/submissions/general` (또는 `/api/solve/{userId}`)을 호출한다.
- **[성장 반영]** 제출 성공 시 내 풀이 목록에 추가되고, 스트릭과 경험치가 즉시 갱신되어야 한다.

---

## 📋 Tasks (Sub-tasks)

### 1. 확장 프로그램 기본 환경 구성
- [x] Manifest V3 설정 및 권한(Storage, Notification, Alarms) 부여
- [x] Background Script 및 Content Script 기본 구조 설정
- [x] Popup UI 퍼블리싱 (기본 레이아웃 및 스타일링)

### 2. 백준 제출 결과 감지 로직 구현 (Content Script)
- [x] 백준 '채점 현황' 페이지 DOM 파싱 로직 구현
- [x] 자신의 아이디 및 "맞았습니다!!" 결과 필터링 기능 구현
- [x] 제출 메타 데이터 추출 (문제 번호, 메모리, 시간, 언어)
- [x] **[핵심]** 제출 소스 코드 추출 (`fetch` 활용하여 비공개 코드 접근)

### 3. 데이터 처리 및 상태 관리 (Background Script)
- [x] Content Script로부터 수신한 메시지 처리 핸들러 구현
- [x] Solved.ac API 연동 (문제 제목, 난이도 등 추가 정보 획득)
- [x] 중복 처리 방지 로직 (이미 처리된 `submitId` 필터링)
- [x] Chrome Local Storage를 활용한 제출 내역 영구 저장

### 4. 서버 연동 및 API 호출 (진행 예정)
- [ ] 사용자 토큰(JWT) 관리 및 인증 헤더 설정 기능
- [ ] **[Backend]** `POST /api/submissions/general` 엔드포인트 연동 (데이터 전송)
- [ ] Room ID 유무에 따른 '일반 제출' vs '게임/스터디' 분기 처리 로직

### 5. UI/UX 개선 및 알림
- [x] 문제 해결 성공 시 시스템 데스크탑 알림 구현
- [x] Popup 내 최근 해결 문제 목록 리스트 뷰 구현
- [x] Popup 내 상세 정보(메모리, 시간) 및 소스 코드 뷰어(토글) 구현
