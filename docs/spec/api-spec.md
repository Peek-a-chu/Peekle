# API 인터페이스 명세서 (REST)

> **Base URL:** `/api/v1`
> **Format:** JSON
> **Auth:** Bearer Token (JWT) in `Authorization` header.
> **Last Updated:** 2026-01-17 (사용자 ERD 및 Redis 명세 반영)

## 1. 인증 (`/auth`)

| Method | Endpoint                 | Summary             | Request Body                            | Response Body                                            |
| :----- | :----------------------- | :------------------ | :-------------------------------------- | :------------------------------------------------------- |
| `POST` | `/auth/login/{provider}` | 소셜 로그인 (OAuth) | `{ "code": "auth_code_from_provider" }` | `{ "accessToken": "jwt...", "refreshToken": "uuid..." }` |
| `POST` | `/auth/refresh`          | 토큰 갱신           | `{ "refreshToken": "uuid..." }`         | `{ "accessToken": "new_jwt..." }`                        |
| `POST` | `/auth/logout`           | 로그아웃            | -                                       | 200 OK                                                   |

## 2. 사용자 및 프로필 (`/users`)

| Method  | Endpoint                    | Summary                        | Request Body                                     | Response Body                                                                                               |
| :------ | :-------------------------- | :----------------------------- | :----------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `GET`   | `/users/me`                 | 내 프로필 정보                 | -                                                | `{ "id": 1, "nickname": "Pkler", "tier": "GOLD_1", "profileImg": "url", "leaguePoint": 1500, "streak": 5 }` |
| `PATCH` | `/users/me`                 | 프로필 수정                    | `{ "nickname": "NewNick", "profileImg": "url" }` | `{ "id": 1, "nickname": "NewNick", ... }`                                                                   |
| `GET`   | `/users/{id}/history`       | 활동 히스토리 조회             | -                                                | `[{ "date": "2026-01-17", "count": 5 }, { "date": "2026-01-16", "count": 2 }]`                              |
| `POST`  | `/users/me/extension-token` | 확장 프로그램 토큰 생성/재생성 | -                                                | `{ "token": "ext-uuid-..." }`                                                                               |
| `GET`   | `/users/me/bookmarks`       | 북마크한 문제집 조회           | `?page=0&size=10`                                | `Page<WorkbookSummary>`                                                                                     |

## 3. 리그 시스템 (`/leagues`)

| Method | Endpoint              | Summary               | Request Body | Response Body                                                                                                                                        |
| :----- | :-------------------- | :-------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/leagues/my-ranking` | 내 리그 랭킹 (실시간) | -            | `{ "myRank": 5, "totalUsers": 30, "tierGroup": "GOLD_2", "seasonWeek": 202603, "topUsers": [ { "userId": 10, "nickname": "Ace", "score": 2000 } ] }` |
| `GET`  | `/leagues/history`    | 과거 리그 결과        | -            | `[{ "seasonWeek": 202602, "tier": "SILVER_1", "finalRank": 1, "result": "PROMOTED" }]`                                                               |

## 4. 스터디 룸 (`/study`) -- _`study_rooms` 반영_

| Method | Endpoint            | Summary                    | Request Body                                                                             | Response Body                                                                                                                          |
| :----- | :------------------ | :------------------------- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/study`            | 활성 스터디 룸 목록        | `?page=0&sort=createdAt,desc`                                                            | `Page<StudyRoomResponse> { "content": [{ "id": 101, "title": "Morning Algo", "owner": "UserA", "memberCount": 3, "tags": ["BFS"] }] }` |
| `POST` | `/study`            | 스터디 룸 생성             | `{ "title": "Algo Study", "description": "Let's go", "capacity": 6, "password": "opt" }` | `{ "id": 101, "token": "openvidu-session-token" }`                                                                                     |
| `GET`  | `/study/{id}`       | 방 상세 정보 조회          | -                                                                                        | `{ "id": 101, "title": "...", "members": [{ "userId": 1, "role": "OWNER" }] }`                                                         |
| `POST` | `/study/{id}/join`  | 스터디 참여                | `{ "password": "..." }`                                                                  | `{ "joined": true, "sessionToken": "..." }`                                                                                            |
| `GET`  | `/study/{id}/chats` | 채팅 히스토리 조회 (Redis) | -                                                                                        | `[{ "senderId": 1, "message": "Hi", "timestamp": "..." }]`                                                                             |

## 5. 게임 시스템 (`/games`) -- _`game_results` 반영_

| Method | Endpoint                 | Summary              | Request Body              | Response Body                                                                                                |
| :----- | :----------------------- | :------------------- | :------------------------ | :----------------------------------------------------------------------------------------------------------- |
| `POST` | `/games/match`           | 매치메이킹 요청 (큐) | `{ "mode": "SPEED_RUN" }` | `{ "status": "QUEUED", "estimatedTime": 30 }`                                                                |
| `GET`  | `/games/{roomId}/status` | 게임 상태 조회       | -                         | `{ "state": "RUNNING", "currentRound": 2, "timeLeft": 120 }`                                                 |
| `GET`  | `/games/{roomId}/result` | 게임 결과 (종료 후)  | -                         | `{ "mode": "SPEED_RUN", "ranks": [{ "userId": 1, "score": 300, "rank": 1 }] }`                               |
| `GET`  | `/users/me/games`        | 내 게임 히스토리     | `?page=0`                 | `Page<GameResult> { "content": [{ "mode": "SPEED_RUN", "rank": 1, "pointEarned": 10, "playedAt": "..." }] }` |

## 6. 제출 및 문제 (`/submissions`, `/problems`)

| Method | Endpoint            | Summary             | Request Body                                                                                            | Response Body                                                                            |
| :----- | :------------------ | :------------------ | :------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| `POST` | `/submissions`      | 코드 제출           | `{ "problemId": 1000, "code": "print(1)", "language": "python", "sourceType": "STUDY", "roomId": 101 }` | `{ "submissionId": 5001, "status": "PENDING" }`                                          |
| `GET`  | `/submissions/{id}` | 결과 확인 (폴링)    | -                                                                                                       | `{ "status": "SUCCESS", "memory": 1024, "executionTime": 120, "result": "CORRECT" }`     |
| `GET`  | `/problems/search`  | 문제 검색 (AI/태그) | `?query=Graph&tier=GOLD`                                                                                | `[{ "id": 1000, "title": "A+B", "tier": "BRONZE_5", "tags": ["MATH"] }]`                 |
| `GET`  | `/workbooks`        | 문제집 목록         | `?filter=public`                                                                                        | `Page<Workbook> { "content": [{ "id": 1, "title": "Samsung Past", "owner": "Admin" }] }` |

## 7. WebSocket 토픽 (STOMP via Redis)

Using `SEND` to `/app/...` and `SUBSCRIBE` to `/topic/...`

| Destination (Client Sub)           | Payload Schema (JSON)                                                                   | Description                           |
| :--------------------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------ |
| `/topic/study/room/{studyId}/chat` | `{ "type": "TALK", "senderId": 1, "nickname": "Kim", "msg": "Hello", "time": "12:00" }` | 채팅 메시지                           |
| `/topic/study/room/{studyId}/code` | `{ "userId": 1, "delta": "{\"ops\":[{\"insert\":\"a\"}]}", "cursor": 50 }`              | 실시간 코드 편집 (Sharedb/Yjs 스타일) |
| `/topic/game/room/{roomId}/score`  | `{ "userId": 3, "currentScore": 150, "rank": 2, "solvedCount": 1 }`                     | 실시간 스코어보드 업데이트            |
| `/topic/game/room/{roomId}/status` | `{ "state": "ROUND_END", "nextRoundStartIn": 5 }`                                       | 게임 단계 변경                        |
| `/topic/league/update`             | `{ "userId": 1, "message": "Promoted to GOLD 1!", "type": "TIER_UP" }`                  | 티어 승급 알림                        |
| `/topic/user/{userId}/noti`        | `{ "type": "INVITE", "fromUser": "Lee", "roomId": 101, "roomTitle": "Join us" }`        | 개인 알림                             |

---

### **Request Payloads Details**

**POST /submissions**

```json
{
  "problemId": 1234,
  "code": "import java.util.*; ...",
  "language": "JAVA",
  "sourceType": "STUDY", // or "GAME", "EXTENSION"
  "roomId": 101 // Nullable if EXTENSION
}
```

**POST /study**

```json
{
  "title": "PS Study Group",
  "description": "Daily 1 problem",
  "capacity": 4,
  "password": null, // Public if null
  "tags": ["BFS", "DP"]
}
```
