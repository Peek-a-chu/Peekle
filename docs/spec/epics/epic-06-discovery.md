# Epic-07: 학습자로서, 나에게 맞는 문제를 찾고 문제집을 관리하고 싶다

## 📌 Overview
이 문서는 방대한 알고리즘 문제 속에서 사용자가 원하는 문제를 효율적으로 찾을 수 있도록 돕는 검색 및 추천 시스템을 정의합니다. 또한, 사용자는 자신만의 문제집을 만들어 체계적으로 학습할 수 있습니다.

## 📋 Stories

### S7-1. 통합 검색 바 (Frontend)
🧾User Story

사용자로서, 이름으로 문제, 문제집 또는 사용자를 검색하고 싶다.

원하는 콘텐츠나 사람을 빠르고 정확하게 찾기 위함이다.

✅ Acceptance Criteria

 검색 바 입력 시 디바운스된 자동 완성 제안 목록이 드롭다운으로 나타나야 한다.

 검색 결과 페이지에서 "문제", "사용자", "문제집" 탭으로 결과가 분류되어 표시되어야 한다.

**🛠 Implementation Tasks**
[ ] `GlobalSearchBar` 컴포넌트 UI 구현
[ ] `useSearch` 커스텀 훅 (API 호출 및 상태 관리)
[ ] 검색 결과 하이라이팅 처리

### S7-2. 검색 API 래퍼 (Backend)
🧾User Story

클라이언트로서, 단일 엔드포인트로 문제와 사용자를 검색하고 싶다.

프론트엔드 로직을 단순화하고 백엔드에서 검색 전략(DB LIKE vs Vector)을 유연하게 전환하기 위함이다.

✅ Acceptance Criteria

 `/api/v1/search` 엔드포인트 하나로 문제, 사용자, 문제집 결과를 통합 반환한다.

 쿼리 파라미터에 따라 DB 검색 또는 Vector DB 검색을 수행한다.

**🛠 Implementation Tasks**
[ ] `SearchController` 및 `IntegratedSearchService` 구현
[ ] 검색 전략 패턴(Strategy Pattern) 구조 설계

### S7-3. 문제집 목록 & 생성 (Frontend)
🧾User Story

사용자로서, 다양한 문제집을 탐색하고 새로운 문제집을 생성하고 싶다.

내 학습 목적에 맞는 문제집을 찾거나, 스터디를 위한 나만의 커리큘럼을 만들기 위함이다.

✅ Acceptance Criteria

 "전체", "내 문제집", "북마크" 탭으로 구분된 목록을 제공한다.

 문제집 생성 버튼을 통해 제목과 설명을 입력하여 새 문제집을 만들 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] `WorkbookList` 컴포넌트 및 정렬 로직 구현
[ ] `WorkbookCreateForm` 구현

### S7-4. 문제집 상세 & 편집 (Frontend)
🧾User Story

사용자로서, 선택한 문제집의 문제를 확인하고, 필요 시 수정하고 싶다.

문제집 내용을 파악하여 북마크하거나, 내가 만든 문제집의 구성을 업데이트하기 위함이다.

✅ Acceptance Criteria

 문제집 상세 보기 시 포함된 문제 목록을 보여준다.

 [편집] 내가 만든 문제집은 드래그 앤 드롭으로 순서를 바꾸거나, 검색을 통해 새로운 문제를 추가할 수 있어야 한다.

**🛠 Implementation Tasks**
[ ] `WorkbookDetail` 뷰 구현
[ ] `WorkbookEditModal` 구현 (React DnD, Split Layout)
[ ] 문제 검색 및 추가 핸들러 구현

### S7-5. 문제집 API (Backend)
🧾User Story

사용자로서, 문제집 데이터를 서버에 저장하고 조회하고 싶다.

기기 간 동기화를 보장하고 타인과 공유하기 위함이다.

✅ Acceptance Criteria

 **Endpoint Definition**:
   - `GET /api/v1/workbooks`: 전체 문제집 목록 조회 (검색, 정렬 지원)
   - `GET /api/v1/workbooks/me`: 내가 만든/스크랩한 문제집 조회
   - `GET /api/v1/workbooks/{workbookId}`: 문제집 상세 조회 (문제 목록 포함)
   - `POST /api/v1/workbooks`: 문제집 생성
   - `PUT /api/v1/workbooks/{workbookId}`: 문제집 수정 (문제 추가/삭제/순서변경)

 **Request Body (Create/Update)**:
   ```json
   {
     "title": "Core CS 알고리즘",
     "description": "필수 문제 모음입니다.",
     "problemIds": [1000, 1001, 2309, 2557] // 배열 순서대로 저장됨
   }
   ```

 문제집 상세 조회 시 로그인 유저의 풀이 여부(`isSolved`)를 매핑하여 반환해야 한다.

**🛠 Implementation Tasks**
[ ] `Workbook` 관련 Entity, Repository, Service 구현
[ ] 문제집 상세 조회 시 풀이 상태(`isSolved`) 매핑 로직 구현

### S7-6. 문제 임베딩 파이프라인 (AI)
🧾User Story

시스템으로서, 문제 설명을 벡터 임베딩으로 변환하고 싶다.

키워드가 일치하지 않아도 의미적으로 유사한 문제를 찾기 위함이다.

✅ Acceptance Criteria

 신규 문제 추가 시 AI 모델을 통해 설명을 벡터화하고 Vector DB(ChromaDB)에 인덱싱해야 한다.

**🛠 Implementation Tasks**
[ ] Python AI 서비스(FastAPI) 또는 Java DJL 연동
[ ] 문제 데이터 전처리 및 임베딩 API 구현
[ ] Vector DB 연결 및 스키마 설정

### S7-7. 시맨틱 검색 로직 (AI)
🧾User Story

사용자로서, 단순 키워드가 아닌 개념(예: "최단 경로")으로 검색하고 싶다.

문제의 의도나 유형에 맞는 연습 문제를 발견하기 위함이다.

✅ Acceptance Criteria

 사용자 쿼리를 벡터로 변환하여 Vector DB에서 유사도 높은 문제들을 검색해 반환한다.

**🛠 Implementation Tasks**
[ ] 시맨틱 검색 Service 로직 구현
[ ] 검색 결과 랭킹 및 필터링(푼 문제 제외 등) 로직

### S7-8. 추천 엔진 (AI)
🧾User Story

사용자로서, 내 티어와 약점에 기반한 "다음 문제" 추천을 받고 싶다.

효율적으로 실력을 향상시키기 위함이다.

✅ Acceptance Criteria

 사용자의 오답 패턴(태그)을 분석하여 유사 난이도의 문제를 선별한다.

 LLM을 이용해 "추천 사유"를 생성하고 Redis에 캐싱하여 제공한다.

**🛠 Implementation Tasks**
[ ] 사용자 취약 태그 분석 및 문제 추출: 유저의 최근 오답 기록을 분석하여 취약한 알고리즘 유형을 파악, 이에 맞는 문제를 ChromaDB에서 검색하는 모듈 구현
[ ] GPT-4o-mini 기반 추천 사유 생성: 선정된 문제와 유저의 학습 상태를 바탕으로 맞춤형 추천 멘트를 생성하는 LLM 기능 구현
[ ] Redis 결과 저장 및 만료 설정: 생성된 데이터를 Redis에 JSON 형태로 저장하고, 24시간 뒤 자동으로 삭제되도록 TTL 스케줄러 설정
