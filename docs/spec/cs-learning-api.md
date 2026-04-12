# CS 학습 데이터 모델 및 API 설계 (#141)

## 1. 목적

CS 탭 MVP에서 아래 항목을 일관되게 처리하기 위한 기준 문서다.

- 도메인/트랙/스테이지/문제 구조
- 사용자 현재 진행 위치
- 문제 제출/채점
- 오답노트 반영
- Redis 임시 상태와 DB 영속 상태 분리

## 2. 범위

포함:

- DB 스키마 (PostgreSQL)
- API 계약(요청/응답 포맷)
- FE 연동용 샘플 응답
- CS 전용 예외 코드 초안

비포함:

- 컨트롤러/서비스 구현 코드
- 운영 시드 데이터
- 통계/랭킹 확장 API

### 2.1 도메인 목록(MVP 9개)

`cs_domains` 시드 기준:

| id | name |
|---:|---|
| 1 | 요구사항·분석·화면설계 |
| 2 | 데이터 입출력·SQL 기초 |
| 3 | 통합·인터페이스 구현 |
| 4 | 프로그래밍 기본 |
| 5 | C 언어 |
| 6 | 자바 |
| 7 | 파이썬 |
| 8 | 서버·보안·테스트 |
| 9 | 운영체제·네트워크·인프라·패키징 |

## 3. 데이터 모델

### 3.1 영속 데이터(DB)

기준 파일:

- `apps/backend/src/main/resources/db/migration-postgres/V3__add_cs_learning.sql`

테이블:

1. `cs_domains`
- `id INT PK`
- `name VARCHAR(100) NOT NULL`

2. `cs_domain_tracks`
- `id BIGINT PK`
- `domain_id INT FK -> cs_domains.id`
- `track_no SMALLINT NOT NULL`
- `name VARCHAR(150) NOT NULL`
- `UNIQUE(domain_id, track_no)`

3. `cs_stages`
- `id BIGINT PK`
- `track_id BIGINT FK -> cs_domain_tracks.id`
- `stage_no SMALLINT NOT NULL`
- `UNIQUE(track_id, stage_no)`

4. `cs_questions`
- `id BIGINT PK`
- `stage_id BIGINT FK -> cs_stages.id`
- `question_type VARCHAR(30)`  
  허용값: `MULTIPLE_CHOICE`, `SHORT_ANSWER`, `OX`
- `prompt TEXT NOT NULL`
- `explanation TEXT`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`

5. `cs_question_choices` (객관식/OX)
- `id BIGINT PK`
- `question_id BIGINT FK -> cs_questions.id`
- `choice_no SMALLINT NOT NULL`
- `content TEXT NOT NULL`
- `is_answer BOOLEAN NOT NULL DEFAULT FALSE`
- `UNIQUE(question_id, choice_no)`

6. `cs_question_short_answers` (단답형)
- `id BIGINT PK`
- `question_id BIGINT FK -> cs_questions.id`
- `answer_text VARCHAR(200) NOT NULL`
- `normalized_answer VARCHAR(200) NOT NULL`
- `is_primary BOOLEAN NOT NULL DEFAULT FALSE`
- `UNIQUE(question_id, normalized_answer)`

7. `cs_user_profiles`
- `user_id BIGINT PK FK -> users.id`
- `current_domain_id INT FK -> cs_domains.id (nullable)`

8. `cs_user_domain_progress`
- `id BIGINT PK`
- `user_id BIGINT FK -> users.id`
- `domain_id INT FK -> cs_domains.id`
- `current_track_no SMALLINT NOT NULL DEFAULT 1`
- `current_stage_no SMALLINT NOT NULL DEFAULT 1`
- `updated_at TIMESTAMP NOT NULL`
- `UNIQUE(user_id, domain_id)`
- 행 존재 자체를 "해당 유저가 공부중인 도메인"으로 해석

9. `cs_wrong_problems`
- `user_id BIGINT FK -> users.id`
- `question_id BIGINT FK -> cs_questions.id`
- `domain_id INT FK -> cs_domains.id` (비정규화, 도메인별 오답 조회 최적화)
- `status VARCHAR(20)` 허용값: `ACTIVE`, `CLEARED`
- `review_correct_count INT NOT NULL DEFAULT 0`
- `wrong_count INT NOT NULL DEFAULT 1`
- `last_wrong_at TIMESTAMP NOT NULL`
- `cleared_at TIMESTAMP NULL`
- `updated_at TIMESTAMP NOT NULL`
- `PRIMARY KEY(user_id, question_id)`
- `INDEX(user_id, domain_id, status, updated_at DESC)`

### 3.2 임시 데이터(Redis)

- 키: `cs:attempt:{userId}:{stageId}`
- 용도: 스테이지 10문제 풀이 진행 상태 임시 저장
- 저장 정보: 문제별 답안/정오/점수/피드백
- 정책:
  - 시작 시 기존 키 초기화
  - 완료 시 서버 집계 후 DB 반영
  - 반영 완료 후 Redis 키 삭제

## 4. 채점 정책

### 4.1 객관식/OX

- 서버가 즉시 채점
- 정답 데이터(`is_answer`)는 FE에 노출하지 않음

### 4.2 단답형

- 사용자 답안을 정규화 후 `normalized_answer`와 비교
- 복수 정답/동의어 허용

서버 설정값:

- `cs.grading.pass-score=7`
- `cs.grading.review-clear-threshold=3`

## 5. API 명세(MVP)

Base: `/api/cs`

인증: `@AuthenticationPrincipal Long userId`

### 5.1 Bootstrap 조회

`GET /api/cs/bootstrap`

설명:

- CS 탭 진입 시 현재 상태 조회
- 마지막 도메인/진행 위치 반환
- MVP에서는 이 응답만으로 현재 트랙 징검다리 UI 렌더링 가능

응답 예시:

```json
{
  "success": true,
  "data": {
    "needsDomainSelection": false,
    "currentDomain": { "id": 1, "name": "요구사항·분석·화면설계" },
    "progress": { "currentTrackNo": 1, "currentTrackName": "요구사항 확인", "currentStageNo": 2 }
  }
}
```

표시 규칙:

- FE가 `currentTrackNo` + `currentStageNo`를 조합해 `1-2` 형태 라벨 생성
- FE는 현재 트랙(기본 10개 스테이지) 상태를 아래 기준으로 렌더링
  - `stageNo < currentStageNo` -> 완료
  - `stageNo = currentStageNo` -> 진행 가능
  - `stageNo > currentStageNo` -> 잠금

### 5.2 추가 가능한 도메인 목록 조회

`GET /api/cs/domains`

설명:

- 전체 도메인 중, 이미 공부중인 도메인(`cs_user_domain_progress` 존재)은 제외하고 반환
- "새로 공부할 도메인 추가" 화면에서 사용

응답 예시:

```json
{
  "success": true,
  "data": [
    { "id": 3, "name": "통합·인터페이스 구현" },
    { "id": 8, "name": "서버·보안·테스트" },
    { "id": 9, "name": "운영체제·네트워크·인프라·패키징" }
  ]
}
```

### 5.3 내 공부 도메인 목록 조회

`GET /api/cs/me/domains`

설명:

- 프로필/CS 홈에서 유저의 공부중 도메인 목록 조회
- 각 도메인의 현재 트랙/스테이지와 현재 보고 있는 도메인 여부 반환

응답 예시:

```json
{
  "success": true,
  "data": [
    {
      "domain": { "id": 1, "name": "요구사항·분석·화면설계" },
      "progress": { "currentTrackNo": 1, "currentTrackName": "요구사항 확인", "currentStageNo": 2 },
      "isCurrent": true
    },
    {
      "domain": { "id": 2, "name": "데이터 입출력·SQL 기초" },
      "progress": { "currentTrackNo": 1, "currentTrackName": "데이터 입출력 구현", "currentStageNo": 1 },
      "isCurrent": false
    }
  ]
}
```

### 5.4 공부중 도메인 추가

`POST /api/cs/me/domains`

요청:

```json
{
  "domainId": 2
}
```

동작:

- `cs_user_domain_progress`가 없으면 `(track=1, stage=1)`로 생성
- 이미 있으면 멱등 처리(성공 응답)
- `current_domain_id`가 비어 있으면 추가한 도메인을 현재 도메인으로 설정

응답 예시:

```json
{
  "success": true,
  "data": {
    "added": true,
    "domain": { "id": 2, "name": "데이터 입출력·SQL 기초" },
    "progress": { "currentTrackNo": 1, "currentTrackName": "데이터 입출력 구현", "currentStageNo": 1 },
    "isCurrent": false
  }
}
```

### 5.5 현재 보는 도메인 변경

`PUT /api/cs/me/current-domain`

요청:

```json
{
  "domainId": 1
}
```

응답 예시:

```json
{
  "success": true,
  "data": {
    "currentDomain": { "id": 1, "name": "요구사항·분석·화면설계" },
    "progress": { "currentTrackNo": 1, "currentTrackName": "요구사항 확인", "currentStageNo": 1 }
  }
}
```

### 5.6 스테이지 시작

`POST /api/cs/stages/{stageId}/attempt/start`

설명:

- Redis attempt 키 초기화
- 첫 문제 반환

응답 예시:

```json
{
  "success": true,
  "data": {
    "stageId": 12,
    "firstQuestion": {
      "questionId": 1201,
      "questionType": "MULTIPLE_CHOICE",
      "prompt": "프로세스와 스레드의 차이로 옳은 것은?",
      "choices": [
        { "choiceNo": 1, "content": "..." },
        { "choiceNo": 2, "content": "..." },
        { "choiceNo": 3, "content": "..." },
        { "choiceNo": 4, "content": "..." }
      ]
    }
  }
}
```

### 5.7 문제 제출/채점

`POST /api/cs/stages/{stageId}/attempt/answer`

공통 요청 필드:

- `questionId` (required)
- 아래 타입별 답안 필드 중 하나

공통 응답 필드:

- `progress.currentQuestionNo`: 현재 문제 번호(1-base)
- `progress.totalQuestionCount`: 전체 문제 수(MVP 기본 10)

요청 예시 (객관식/OX):

```json
{
  "questionId": 1201,
  "selectedChoiceNo": 2
}
```

요청 예시 (단답형 `SHORT_ANSWER`):

```json
{
  "questionId": 1202,
  "answerText": "교환성"
}
```

응답 예시 (단답형):

```json
{
  "success": true,
  "data": {
    "questionId": 1202,
    "questionType": "SHORT_ANSWER",
    "progress": { "currentQuestionNo": 2, "totalQuestionCount": 10 },
    "isCorrect": true,
    "feedback": "정답입니다.",
    "isLast": false,
    "nextQuestion": {
      "questionId": 1203,
      "questionType": "OX",
      "prompt": "스레드는 독립 메모리 공간을 가진다.",
      "choices": [
        { "choiceNo": 1, "content": "O" },
        { "choiceNo": 2, "content": "X" }
      ]
    }
  }
}
```

### 5.8 스테이지 완료/결과 조회

`POST /api/cs/stages/{stageId}/attempt/complete`

설명:

- Redis attempt 집계
- 최종 결과 생성
- 틀린 문제를 `cs_wrong_problems`에 반영
- 진행도 갱신 후 Redis 키 삭제
- 결과창은 "정답률 + 조건부 스트릭 + 랜덤 문구" 중심으로 단순 노출

결과창 표시 규칙:

- 필수 표시: `correctRate` (예: 70%)
- 문구: `messageCode`를 기반으로 FE에서 랜덤/고정 문구 매핑
  - MVP는 DB 저장 없이 서버/FE 코드 상수로 관리
- 스트릭:
  - `streakEarnedToday=true`일 때만 "오늘 스트릭 +1" 강조 UI 노출
  - `streakEarnedToday=false`이면 스트릭 관련 문구/UI 미노출
  - 스트릭 증감/중복 판정은 서버 권한이며 KST(Asia/Seoul) 06:00 경계 기준
- 틀린 문제 개별 목록은 결과창에서 미노출(오답노트 화면에서만 조회)
- CTA:
  - `isTrackCompleted=false`: `다음 스테이지 풀기` + `CS 탭으로 돌아가기`
  - `isTrackCompleted=true`: `완료(확인)` + `CS 탭으로 돌아가기`
- 이동 정보:
  - `isTrackCompleted=false`: `nextStageId` 반환
  - `isTrackCompleted=true`: `nextStageId=null`

응답 예시 (트랙 미완료):

```json
{
  "success": true,
  "data": {
    "stageId": 12,
    "isTrackCompleted": false,
    "correctRate": 70,
    "correctCount": 7,
    "wrongCount": 3,
    "messageCode": "CS_RESULT_GOOD",
    "streakEarnedToday": true,
    "currentStreak": 5,
    "nextStageId": 13
  }
}
```

응답 예시 (트랙 완료):

```json
{
  "success": true,
  "data": {
    "stageId": 20,
    "isTrackCompleted": true,
    "correctRate": 80,
    "correctCount": 8,
    "wrongCount": 2,
    "messageCode": "CS_RESULT_EXCELLENT",
    "streakEarnedToday": false,
    "currentStreak": 5,
    "nextStageId": null
  }
}
```

### 5.9 오답노트 조회

설명:

- 오답노트는 상태별 탭으로 분리해 조회한다.
- 기본 탭: `복습할 문제` (`status=ACTIVE`)
- 보조 탭: `복습 완료` (`status=CLEARED`)
- MVP에서는 `전체` 탭은 제공하지 않는다.

요청 예시:

- `GET /api/cs/wrong-problems?domainId=1&status=ACTIVE&page=0&size=20`
- `GET /api/cs/wrong-problems?domainId=1&status=CLEARED&page=0&size=20`

응답 예시:

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "questionId": 1203,
        "lastWrongAt": "2026-04-11T15:20:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1
  }
}
```

## 6. 예외 코드 표준(초안)

`ErrorCode` 추가 권장:

- `CS_001` DOMAIN_NOT_FOUND (404)
- `CS_002` TRACK_NOT_FOUND (404)
- `CS_003` STAGE_NOT_FOUND (404)
- `CS_004` QUESTION_NOT_FOUND (404)
- `CS_005` INVALID_QUESTION_TYPE (400)
- `CS_006` INVALID_ANSWER_PAYLOAD (400)
- `CS_007` ATTEMPT_NOT_FOUND (404)
- `CS_008` ATTEMPT_EXPIRED (410)
- `CS_009` DOMAIN_PROGRESS_NOT_FOUND (404)
- `CS_010` FORBIDDEN_STAGE_ACCESS (403)
- `CS_013` DOMAIN_NOT_STUDYING (400)

오류 응답 형식:

```json
{
  "success": false,
  "error": {
    "code": "CS_003",
    "message": "스테이지를 찾을 수 없습니다."
  }
}
```

## 7. 구현 순서 제안

1. 도메인/트랙/스테이지/문제 조회 API
2. 공부중 도메인 목록/추가/현재 도메인 전환 API
3. attempt start/answer/complete API
4. 오답노트 조회/복습 반영 API

## 8. 비고

본 문서는 #141 설계 기준이며, 구현 이슈(#142~#150) 진행 중 세부 규칙이 보완될 수 있다.
