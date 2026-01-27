# Epic-11: 스터디 그룹 간의 경쟁을 통해 소속감을 높이고 싶다

## 📌 Overview
이 문서는 스터디 그룹 간의 랭킹 시스템을 다룹니다. 사용자들은 우리 스터디의 순위를 확인하고, 그룹원들과 협력하여 랭킹을 올리는 재미를 느낄 수 있습니다.

## 📋 Stories

### S11-1. 스터디 랭킹 보드 (Frontend)
🧾User Story

사용자로서, 전체 스터디 그룹 중 상위 그룹과 전체 순위를 보고 싶다.

어떤 스터디가 가장 활발하게 활동하는지 파악하고 경쟁심을 느끼기 위함이다.

✅ Acceptance Criteria

 Top 3 스터디 강조(포디움) 및 나머지 리스트 표시.

 페이지네이션 지원.

**🛠 Implementation Tasks**
[ ] `StudyRankingBoard` 페이지 레이아웃 구현
[ ] `TopThreePodium` 컴포넌트 구현
[ ] `StudyRankingList` 컴포넌트 및 페이지네이션 로직

### S11-2. 스터디 랭킹 상세 (Frontend)
🧾User Story

사용자로서, 특정 스터디를 클릭했을 때 멤버들의 기여도를 보고 싶다.

팀 내에서 누가 점수를 많이 획득했는지 확인하고, 해당 멤버의 프로필로 이동하기 위함이다.

✅ Acceptance Criteria

 스터디 클릭 시 상세 모달에서 멤버별 기여 점수 순위를 보여준다.

 멤버 클릭 시 프로필 페이지로 이동한다.

**🛠 Implementation Tasks**
[ ] `StudyDetailModal` 구현
[ ] 멤버별 기여 점수 조회 API 연동
[ ] 프로필 라우팅 처리

### S11-3. 스터디 랭킹 조회 API (Backend)
🧾User Story

클라이언트로서, 정렬된 스터디 랭킹 데이터와 상세 정보를 조회하고 싶다.

랭킹 페이지와 상세 모달을 구성하기 위함이다.

✅ Acceptance Criteria

 스터디 랭킹 포인트 내림차순 목록 조회 API.

 특정 스터디의 멤버별 기여도 조회 API.

**🛠 Implementation Tasks**
[ ] `StudyRankingService` 구현
[ ] JPA 또는 Native SQL을 이용한 랭킹 정렬 및 페이징 쿼리 작성
[ ] 스터디 멤버 단순 조회 API 구현
