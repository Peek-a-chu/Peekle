# 데이터베이스 스키마 설계 (Database Schema Design)
> **프로젝트:** Peekle
> **유형:** 관계형 데이터베이스 (MySQL 8.0+)
> **ORM:** Spring Data JPA
> **최종 업데이트:** 2026-01-17 (사용자 ERD 반영)

## 1. 개체 관계 다이어그램 (ERD)

```mermaid
erDiagram
    USERS ||--o{ SOCIAL_ACCOUNTS : has
    USERS ||--o{ LEAGUE_HISTORY : records
    USERS ||--o{ STUDY_MEMBERS : joins
    USERS ||--o{ SUBMISSION_LOGS : submits
    USERS ||--o{ WORKBOOKS : creates
    USERS ||--o{ WORKBOOK_BOOKMARKS : bookmarks
    USERS ||--o{ WORKBOOKS : creates
    USERS ||--o{ WORKBOOK_BOOKMARKS : bookmarks

    LEAGUE_GROUPS ||--o{ USERS : contains

    STUDY_ROOMS ||--o{ STUDY_MEMBERS : has
    STUDY_ROOMS ||--o{ STUDY_CHAT_LOGS : contains

    PROBLEMS ||--o{ SUBMISSION_LOGS : referenced_in
    PROBLEMS ||--o{ WORKBOOK_PROBLEMS : included_in

    WORKBOOKS ||--o{ WORKBOOK_PROBLEMS : contains
    WORKBOOKS ||--o{ WORKBOOK_BOOKMARKS : saved_by

    USERS {
        bigint id PK
        string nickname
        string profile_img
        string boj_id "백준 ID (확장프로그램 연동용)"
        string tier "CURRENT_TIER (Enum)"
        int league_point "이번 주 획득 점수"
        bigint league_group_id FK "이번 주 배정된 리그 그룹"
        int streak_current
        int streak_max
        boolean is_deleted
        datetime created_at
    }

    LEAGUE_GROUPS {
        bigint id PK
        string tier "티어 등급"
        int season_week "2024-W10 (시즌 주차)"
        datetime created_at
    }

    LEAGUE_GROUPS {
        BIGINT id PK
        VARCHAR(20) tier %% 티어 등급
        INT season_week %% YYYYWW (ex: 202410)
        DATETIME created_at
    }
    
    %% 스트릭 용 테이블
    DAILY_SOLVED_COUNTS { 
        BIGINT id PK
        BIGINT user_id FK
        DATE solved_date
        INT problem_count %% 성공한 문제 수
    }

    POINT_LOGS {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR(20) category %% PROBLEM | GAME
        INT amount %% 획득 점수
        VARCHAR(255) description %% UI 표시용
        TEXT metadata %% JSON
        DATETIME created_at
    }

    LEAGUE_HISTORY {
        bigint id PK
        bigint user_id FK
        string tier "당시 티어"
        int final_point
        int final_rank
        string result "PROMOTED | STAY | DEMOTED"
        datetime closed_at "시즌 종료일"
    }

    STUDY_ROOMS {
        bigint id PK
        string title
        string description
        bigint owner_id FK
        boolean is_active
        datetime created_at
    }

    STUDY_MEMBERS {
        bigint id PK
        bigint study_id FK
        bigint user_id FK
        string role "OWNER | MEMBER"
        datetime joined_at
    }

    PROBLEMS {
        bigint id PK
        string source "BOJ | SWEA"
        string external_id "1000 (문제번호)"
        string title
        string tier "Gold 5"
        string tags "JSON or String"
        string url
    }

    SUBMISSION_LOGS {
        bigint id PK
        bigint user_id FK
        bigint problem_id FK
        string source_type "STUDY | GAME | EXTENSION"
        bigint room_id FK "스터디/게임 방 ID (Nullable)"
        string code "제출 코드 (Text)"
        int memory
        int execution_time
        string language
        datetime submitted_at
    }

    POINT_LOGS {
        bigint id PK
        bigint user_id FK
        string category "PROBLEM | GAME"
        int amount "획득 점수"
        datetime created_at
    }



    WORKBOOK_PROBLEMS {
        bigint workbook_id FK
        bigint problem_id FK
        int display_order
        datetime created_at
    }

    WORKBOOK_BOOKMARKS {
        bigint workbook_id FK
        bigint user_id FK
        datetime created_at
    }

    WORKBOOKS {
        bigint id PK
        bigint owner_id FK
        string title
        string description
        boolean is_public
        int bookmark_count
    }
```

## 2. 테이블 상세 명세 (Table Specifications)

### 2.1 사용자 & 리그 도메인 (User & League Domain)

**`users`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | 사용자 ID |
| `social_id` | VARCHAR(255) | UQ, NOT NULL | 소셜 로그인 ID |
| `provider` | VARCHAR(255) | NOT NULL | 소셜 로그인 제공자 |
| `nickname` | VARCHAR(255) | UQ | 표시용 닉네임 |
| `profile_img` | VARCHAR(255) | | 프로필 이미지 URL |
| `profile_img_thumb` | VARCHAR(255) | | 프로필 이미지 썸네일 URL |
| `boj_id` | VARCHAR(50) | NULL | 확장프로그램 연동용 외부 ID |
| `extension_token` | VARCHAR(100) | UQ | 확장프로그램 연동용 토큰 (UUID) |
| `extension_token_updated_at` | DATETIME | | 토큰 발급/갱신 일시 |
| `league` | VARCHAR(20) | Default 'BRONZE' | 현재 리그 |
| `league_point` | INT | Default 0 | 이번 주 획득 리그 포인트 |
| `league_group_id` | BIGINT | FK -> league_groups.id | 이번 주 배정된 리그 그룹 ID |
| `streak_current` | INT | Default 0 | 현재 연속 스트릭 |
| `streak_max` | INT | Default 0 | 최대 연속 스트릭 |
| `max_league` | VARCHAR(255) | | 달성한 최고 리그 |
| `is_deleted` | BOOLEAN | Default FALSE | 탈퇴 여부 |
| `created_at` | DATETIME(6) | NOT NULL | 가입 일시 |

**`league_groups`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | 그룹 ID |
| `tier` | VARCHAR(20) | | 해당 그룹의 현재 리그 |
| `season_week` | INT | | 예: 202603 (YYYYWW) |

**`league_history`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | |
| `user_id` | BIGINT | FK -> users.id | |
| `league` | VARCHAR(20) | | 종료 시점 리그 |
| `final_point` | INT | | 최종 점수 |
| `result` | VARCHAR(20) | | 승급(PROMOTED)/강등(DEMOTED) 여부 |
| `season_week` | INT | | 시즌 주차 (YYYYWW) |
| `closed_at` | DATETIME | | 시즌 종료일 |

**`daily_solved_counts`** (스트릭)
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | BIGINT | PK |
| `user_id` | BIGINT | 유저 ID |
| `solved_date` | DATE | 날짜 |
| `problem_count` | INT | 당일 해결 문제 수 |

**`point_logs`** (점수 이력)
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | BIGINT | PK |
| `user_id` | BIGINT | 유저 ID |
| `category` | VARCHAR(20) | PROBLEM, GAME |
| `amount` | INT | 획득 점수 |
| `metadata` | TEXT | JSON 예: `{ "mode": "SPEED", "rank": 1 }` |

### 2.2 스터디 & 게임 도메인 (Study & Game Domain)

**`study_rooms`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | |
| `title` | VARCHAR(100) | | 방 제목 |
| `owner_id` | BIGINT | FK -> users.id | 방장 |
| `is_active` | BOOLEAN | Default TRUE | 방 활성 상태 |
| `ranking_point` | INT | Default 0 | 스터디 랭킹 총점 (Cache) |

**`study_members`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | |
| `study_id` | BIGINT | FK | |
| `user_id` | BIGINT | FK | |
| `role` | VARCHAR(20) | | OWNER(방장), MEMBER(참여원) |

**`study_chat_logs`**
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | BIGINT | PK |
| `study_id` | BIGINT | 스터디 방 ID |
| `user_id` | BIGINT | 보낸 사람 |
| `message` | TEXT | 메시지 내용 |
| `type` | VARCHAR(20) | TALK, CODE_REVIEW, SYSTEM |
| `ref_submission_id` | BIGINT | 코드 멘션 시 참조할 제출 ID |
| `metadata` | TEXT | 라인 번호 등 (JSON) |

**`study_problems`**
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | BIGINT | PK |
| `study_id` | BIGINT | 스터디 방 ID |
| `problem_id` | BIGINT | 문제 ID |
| `problem_date` | DATE | 캘린더 표시 날짜 |
| `created_by` | BIGINT | 추가한 사람 |

**`problem`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | 문제 ID |
| `source` | VARCHAR(255) | NOT NULL | 출처 (BOJ, SWEA 등) |
| `external_id` | VARCHAR(255) | UQ, NOT NULL | 외부 문제 번호 |
| `title` | VARCHAR(255) | NOT NULL | 문제 제목 |
| `tier` | VARCHAR(255) | NOT NULL | 문제 난이도/티어 |
| `url` | TEXT | NOT NULL | 문제 링크 URL |

**`submission_log`**
| 컬럼 (Column) | 타입 (Type) | 제약조건 (Constraints) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK | 로그 ID |
| `user_id` | BIGINT | FK -> users.id | 제출한 사용자 |
| `problem_id` | BIGINT | FK -> problem.id | 푼 문제 |
| `source_type` | VARCHAR(255) | | STUDY, GAME, EXTENSION |
| `room_id` | BIGINT | | 스터디/게임 방 ID (Nullable) |
| `problem_title` | VARCHAR(255) | | 문제 제목 (역정규화) |
| `problem_tier` | VARCHAR(255) | | 문제 티어 (역정규화) |
| `code` | TEXT | | 제출한 코드 |
| `memory` | INT | | 메모리 사용량 (KB) |
| `execution_time` | INT | | 실행 시간 (ms) |
| `language` | VARCHAR(255) | | 사용 언어 |
| `submitted_at` | DATETIME(6) | | 제출 일시 |


**`workbook_problems`**
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `workbook_id` | BIGINT | 문제집 ID |
| `problem_id` | BIGINT | 문제 ID |
| `display_order` | INT | 정렬 순서 |

**`workbook_bookmarks`**
| 컬럼 | 타입 | 설명 |
| :--- | :--- | :--- |
| `workbook_id` | BIGINT | 문제집 ID |
| `user_id` | BIGINT | 유저 ID |

## 3. Redis 데이터 및 메시징 전략 (Redis Data & Messaging Strategy)

Redis는 새로운 스키마를 반영하여 주로 **실시간 리그 랭킹**과 **단기적인 방 상태(Room State)**를 처리합니다.

### 3.1 키-값 레이아웃 (저장소)

| 키 패턴 (Key Pattern) | 타입 (Type) | TTL | 설명 (Description) | 용도 (Usage) |
| :--- | :--- | :--- | :--- | :--- |
| `league:{seasonWeek}:{groupId}:rank` | ZSet | 2 Weeks | 리그 내 실시간 랭킹 | `ZADD key score userId` |
| `user:{userId}:status` | String | 5 min | 온라인 상태 / 위치 | `SET key "LOBBY" EX 300` |
| `auth:refresh:{handle}` | String | 14 days | Refresh Token | 인증 보안 |
| `game:room:{roomId}:state` | Hash | 4 hours | 활성 게임 방 상태 | 단계(Phase), 타이머, 참여자 |
| `study:room:{studyId}:chat` | List | 1 day | 최근 채팅 내역 (일시적) | LPUSH/LRANGE |

### 3.2 Pub/Sub 채널 (토픽)

`study_rooms` 및 `game`의 분리를 반영하여 업데이트되었습니다.

| 채널명 패턴 (Channel Name Pattern) | 용도 (Usage) | 페이로드 예시 (Payload Example) |
| :--- | :--- | :--- |
| `topic.study.room.{studyId}.chat` | 스터디 채팅 | `{ "senderId": 1, "msg": "Hi", "type": "TALK" }` |
| `topic.study.room.{studyId}.code` | 코드 동기화 (CRDT-lite) | `{ "userId": 1, "delta": "...", "cursor": 12 }` |
| `topic.game.room.{roomId}.score` | 게임 스코어보드 | `{ "userId": 5, "score": 200, "solved": true }` |
| `topic.league.update` | 전역/사용자 리그 알림 | `{ "targetUser": 1, "msg": "Rank Up!" }` |
| `topic.notification.{userId}` | 개인 알림 | `{ "type": "INVITE", "from": "UserA", "roomId": 10 }` |

### 3.3 Redis 로직 매핑 (Redis Logic Mapping)

1.  **리그 랭킹 (League Ranking)**:
    *   DB에서 `USERS.league_point`가 업데이트되면, 비동기적으로 Redis ZSet `league:{season_week}:{league_group_id}:rank`을 업데이트합니다.
    *   API `GET /leagues/my-ranking`은 속도를 위해 주로 Redis ZSet에서 읽어옵니다 (Cache-Aside 또는 Write-Through 개념).

2.  **게임 상태 (Game State)**:
    *   `game:room:{id}` 속성: `status` (WAITING/RUNNING), `round` (1..5), `startTime`.
    *   휘발성 데이터(Volatile data); 게임 종료 후 삭제되며 결과는 `GAME_RESULTS` (MySQL)에 기록됩니다.
