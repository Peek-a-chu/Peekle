# Epic-10: 경쟁 참여자로서, 개인 및 스터디의 순위를 확인하고 경쟁심을 고취하고 싶다

## 📌 Overview
이 문서는 개인 리그 시스템과 스터디 그룹 간의 랭킹 시스템을 다룹니다. 사용자들은 자신의 티어 위치를 확인하고, 승급을 위해 노력하며, 스터디 그룹원들과 협력하여 그룹 랭킹을 올리는 재미를 느낄 수 있습니다.

## 📋 Stories

### S10-1. 리그 랭킹 테이블 (Frontend)
🧾User Story

사용자로서, 내 리그 그룹(20명) 내에서 내 위치를 보고 싶다.

승급 가능권인지 강등 위험권인지 파악하여 경쟁심을 갖기 위함이다.

✅ Acceptance Criteria

 같은 리그 그룹 내 20명의 랭킹 포인트 순위를 표시한다.

 내 행(Row) 강조 및 승급/강등 라인을 시각적으로 구분한다.

 최고 도달 리그(Max League) 뱃지를 표시한다.

**🛠 Implementation Tasks**
[ ] `LeagueRankingTable` 컴포넌트 구현
[ ] 내 순위 하이라이팅 CSS 적용
[ ] 승급/강등 라인 렌더링 로직
[ ] 최고 티어 표시 UI 추가

### S10-2. 리그 조회 API (Backend)
🧾User Story

클라이언트로서, 현재 사용자의 리그 그룹 데이터를 조회하고 싶다.

랭킹 테이블 UI를 구성하기 위함이다.

✅ Acceptance Criteria

 `/api/v1/leagues/me` 호출 시 그룹 멤버들의 랭킹 정보를 반환한다.

 Redis ZSet을 활용하여 조회를 최적화하고, `max_league` 정보를 포함한다.

**🛠 Implementation Tasks**
[ ] `LeagueService` 랭킹 조회 로직 구현
[ ] Redis 캐싱 전략(Look-aside) 적용
[ ] User Entity `max_league` 필드 추가 및 갱신 로직 (승급 시 체크)

### S10-3. 티어 분포 그래프 (Frontend)
🧾User Story

사용자로서, 전체 사용자의 티어별 분포를 보고 싶다.

전체 생태계에서 나의 객관적인 위치를 파악하기 위함이다.

✅ Acceptance Criteria

 전체 유저의 티어 분포를 막대 차트로 보여주며, 내 티어 구간을 강조한다.

**🛠 Implementation Tasks**
[ ] `TierDistributionChart` 컴포넌트 구현
[ ] 전체 통계 조회 API 연동

### S10-4. 리그 스케줄러 (Backend)
🧾User Story

시스템으로서, 매주 수요일 새벽에 리그 승급/강등을 일괄 처리하고 싶다.

새로운 시즌(주차)을 시작하고 리그 생태계를 순환시키기 위함이다.

✅ Acceptance Criteria

 매주 수요일 06:00 배치 작업을 통해 승급/강등 처리, 포인트 리셋, 새로운 그룹 배정을 수행한다.

**🛠 Implementation Tasks**
[ ] Spring Batch Job 설정 및 Step 구성
[ ] `LeagueTier` Enum 규칙 적용 로직 구현
[ ] 트랜잭션 범위 설정 및 예외 처리

### S10-5. 스터디 랭킹 보드 (Frontend)
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

### S10-6. 스터디 랭킹 상세 (Frontend)
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

### S10-7. 스터디 랭킹 조회 API (Backend)
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
