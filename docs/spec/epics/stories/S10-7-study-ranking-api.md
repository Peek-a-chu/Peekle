# S8-3. 스터디 랭킹 조회 API (Backend)

## 📌 Story Information

- **Epic**: Epic-08 (Ranking)
- **Story ID**: S8-3 (Original: S11-3)
- **Sprint**: TBD
- **Estimated Effort**: 2-3 days
- **Priority**: High (Frontend 의존성)
- **Dependencies**: None
- **Status**: Ready

---

## 🧾 User Story

**As a** 클라이언트
**I want to** 정렬된 스터디 랭킹 데이터와 상세 정보를 조회하고 싶다
**So that** 랭킹 페이지와 상세 모달을 구성하기 위함이다

---

## ✅ Acceptance Criteria

1. **스터디 랭킹 목록 조회 API**
   - 스터디를 랭킹 포인트(`ranking_point`) 내림차순으로 정렬하여 반환해야 한다
   - 페이지네이션을 지원해야 한다 (기본값: page=0, size=10)
   - 각 스터디의 다음 정보를 포함해야 한다:
     - 순위 (rank)
     - 스터디 ID (studyId)
     - 스터디 이름 (name)
     - 총 랭킹 포인트 (totalPoint)
     - 멤버 수 (memberCount)
     - 멤버 목록 (members) - 최대 N명 또는 전체

2. **스터디 멤버 기여도 조회 API** (선택사항)
   - 특정 스터디의 멤버별 기여 점수를 조회할 수 있어야 한다
   - 멤버는 기여 점수 내림차순으로 정렬되어야 한다
   - 각 멤버의 다음 정보를 포함해야 한다:
     - 사용자 ID (userId)
     - 닉네임 (nickname)
     - 프로필 이미지 (profileImg)
     - 역할 (role: OWNER/MEMBER)
     - 기여 점수 (contributionPoint)
     - 스터디 내 순위 (rank)

3. **성능 최적화**
   - 대량의 데이터 조회 시 N+1 문제 방지
   - 적절한 인덱스 활용 (ranking_point 컬럼)
   - 페이징 쿼리 최적화

4. **에러 처리**
   - 존재하지 않는 스터디 조회 시 적절한 에러 응답
   - 잘못된 페이지 번호 처리

---

## 🛠 Implementation Tasks

### Task 1: 기존 RankService 검토 및 개선
- [ ] `apps/backend/src/main/java/com/peekle/domain/rank/service/RankService.java` 검토
- [ ] 현재 구현이 요구사항을 만족하는지 확인
- [ ] 필요시 쿼리 최적화 (N+1 문제 해결)
- [ ] 멤버 수 계산 로직 검증

### Task 2: RankController 검토 및 개선
- [ ] `apps/backend/src/main/java/com/peekle/domain/rank/controller/RankController.java` 검토
- [ ] 현재 엔드포인트가 요구사항을 만족하는지 확인
- [ ] 요청 파라미터 검증 로직 추가 (선택사항)
- [ ] API 문서화 (Swagger/OpenAPI 어노테이션)

### Task 3: 멤버 기여도 조회 API 구현 (필요시)
- [ ] `RankController`에 `GET /api/ranks/{studyId}/members` 엔드포인트 추가
- [ ] `RankService`에 `getStudyMemberContributions(Long studyId)` 메서드 추가
- [ ] 멤버별 기여 점수 계산 로직 구현
   - 각 멤버의 리그 포인트 합계 또는 스터디 활동 기반 점수 계산
   - 또는 `StudyMember`와 `User`의 `leaguePoint`를 활용
- [ ] `StudyMemberContributionResponse` DTO 생성
- [ ] 기여 점수 내림차순 정렬 및 순위 계산

### Task 4: 쿼리 최적화
- [ ] `StudyRoomRepository.findRankings()` 메서드 검토
- [ ] `StudyRoomRepositoryImpl`의 쿼리 최적화
- [ ] JOIN을 활용한 N+1 문제 해결
- [ ] `ranking_point` 컬럼에 인덱스 존재 확인 (없으면 마이그레이션 추가)

### Task 5: 테스트 작성
- [ ] `apps/backend/src/test/java/com/peekle/domain/rank/service/RankServiceTest.java` 생성
- [ ] 랭킹 조회 테스트 (정렬, 페이징)
- [ ] 멤버 기여도 조회 테스트 (필요시)
- [ ] 엣지 케이스 테스트 (빈 리스트, 단일 스터디 등)
- [ ] `apps/backend/src/test/java/com/peekle/domain/rank/controller/RankControllerTest.java` 생성
- [ ] API 엔드포인트 통합 테스트

### Task 6: API 문서화
- [ ] Swagger/OpenAPI 어노테이션 추가
- [ ] 요청/응답 예시 문서화
- [ ] 에러 응답 문서화

---

## 📝 Technical Notes

### 현재 구현 상태
- `RankController`에 이미 `GET /api/ranks` 엔드포인트가 존재
- `RankService.getRanking()` 메서드가 랭킹 조회 로직을 구현
- `RankResponse` DTO에 필요한 필드들이 포함되어 있음
- `StudyMemberResponse`가 멤버 정보를 포함

### API 엔드포인트

#### 1. 스터디 랭킹 목록 조회
```
GET /api/ranks?page=0&size=10&keyword=&scope=ALL
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "rank": 1,
        "studyId": 1,
        "name": "알고리즘 스터디",
        "totalPoint": 1500,
        "memberCount": 5,
        "members": [
          {
            "userId": 1,
            "nickname": "user1",
            "profileImg": "https://...",
            "role": "OWNER",
            "isOnline": true
          }
        ]
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10
    },
    "totalElements": 50,
    "totalPages": 5
  },
  "error": null
}
```

#### 2. 스터디 멤버 기여도 조회 (필요시)
```
GET /api/ranks/{studyId}/members
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": 1,
      "nickname": "user1",
      "profileImg": "https://...",
      "role": "OWNER",
      "contributionPoint": 500,
      "rank": 1
    }
  ],
  "error": null
}
```

### 데이터베이스 스키마
- `study_rooms` 테이블의 `ranking_point` 컬럼 사용
- `study_members` 테이블과 `users` 테이블 JOIN 필요
- `users` 테이블의 `league_point`를 멤버 기여도로 활용 가능

### 쿼리 최적화 고려사항
- `ranking_point` 컬럼에 인덱스 추가 권장
- 페이징 시 `OFFSET`과 `LIMIT` 활용
- 멤버 조회 시 `IN` 쿼리 또는 JOIN 활용하여 N+1 방지
- 필요시 `@EntityGraph` 또는 `@Query` 어노테이션 활용

### 기여도 계산 로직 (선택사항)
멤버 기여도는 다음 중 하나의 방식으로 계산 가능:
1. **리그 포인트 합계**: 각 멤버의 `league_point`를 그대로 사용
2. **스터디 활동 기반**: 스터디 내 문제 해결 수, 제출 수 등 기반 계산
3. **하이브리드**: 리그 포인트 + 스터디 활동 점수

현재는 `RankResponse`에 `members` 필드가 이미 포함되어 있으므로, 추가 API 없이 기존 응답을 활용할 수 있습니다. 다만 멤버별 기여 점수와 순위가 명시적으로 필요하다면 별도 엔드포인트가 필요할 수 있습니다.

---

## 🔗 Related Stories
- S8-1: 스터디 랭킹 보드 (Frontend) - 이 API를 사용하여 랭킹 보드 구현
- S8-2: 스터디 랭킹 상세 (Frontend) - 멤버 기여도 조회 (필요시)
