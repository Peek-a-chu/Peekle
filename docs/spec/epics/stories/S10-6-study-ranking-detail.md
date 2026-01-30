# S8-2. 스터디 랭킹 상세 (Frontend)

## 📌 Story Information

- **Epic**: Epic-08 (Ranking)
- **Story ID**: S8-2 (Original: S11-2)
- **Sprint**: TBD
- **Estimated Effort**: 1-2 days
- **Priority**: Medium
- **Dependencies**: S8-1 (Ranking Board), S8-3 (Backend API)
- **Status**: Ready

---

## 🧾 User Story

**As a** 사용자
**I want to** 특정 스터디를 클릭했을 때 멤버들의 기여도를 보고 싶다
**So that** 팀 내에서 누가 점수를 많이 획득했는지 확인하고, 해당 멤버의 프로필로 이동하기 위함이다

---

## ✅ Acceptance Criteria

1. **모달 표시**
   - 스터디 클릭 시 상세 모달이 열려야 한다
   - 모달에는 스터디 이름, 총 랭킹 포인트, 멤버 수가 표시되어야 한다

2. **멤버별 기여도 순위**
   - 멤버들을 기여 점수(랭킹 포인트) 내림차순으로 정렬하여 표시
   - 각 멤버 항목에는 순위, 프로필 이미지, 닉네임, 기여 점수가 표시되어야 한다
   - 방장은 뱃지 또는 아이콘으로 표시

3. **프로필 이동**
   - 멤버 클릭 시 해당 멤버의 프로필 페이지(`/profile/{nickname}`)로 이동해야 한다
   - 모달은 닫히거나 유지할 수 있음 (UX 결정 필요)

4. **모달 닫기**
   - 모달 외부 클릭 또는 닫기 버튼으로 모달을 닫을 수 있어야 한다
   - ESC 키로도 모달을 닫을 수 있어야 한다

5. **로딩 상태**
   - 멤버 데이터 로딩 중에는 스켈레톤 UI 또는 로딩 인디케이터 표시

---

## 🛠 Implementation Tasks

### Task 1: 멤버 기여도 조회 API 클라이언트 함수 구현
- [ ] `apps/frontend/src/api/rankingApi.ts`에 함수 추가
- [ ] `getStudyMemberContributions(studyId)` 함수 구현
- [ ] API 응답 타입 정의 (`StudyMemberContributionResponse` 인터페이스)
- [ ] 에러 핸들링 로직 포함

### Task 2: StudyDetailModal 컴포넌트 구현
- [ ] `apps/frontend/src/domains/ranking/components/StudyDetailModal.tsx` 생성
- [ ] Shadcn/UI Dialog 컴포넌트 활용
- [ ] 모달 헤더에 스터디 이름, 총 포인트, 멤버 수 표시
- [ ] 모달 닫기 버튼 구현
- [ ] 외부 클릭 및 ESC 키로 닫기 기능

### Task 3: MemberContributionList 컴포넌트 구현
- [ ] `apps/frontend/src/domains/ranking/components/MemberContributionList.tsx` 생성
- [ ] 멤버 리스트 렌더링
- [ ] 각 멤버 항목에 순위, 프로필 이미지, 닉네임, 기여 점수 표시
- [ ] 방장 뱃지 표시 (role === 'OWNER')
- [ ] 멤버 클릭 시 프로필 페이지로 라우팅 (`/profile/{nickname}`)
- [ ] 호버 효과 및 시각적 피드백

### Task 4: StudyRankingBoard와 모달 연동
- [ ] `StudyRankingBoard.tsx`에 모달 상태 관리 추가
- [ ] 선택된 스터디 ID 상태 관리
- [ ] TopThreePodium 및 StudyRankingList에서 클릭 이벤트 처리
- [ ] 클릭 시 모달 열기 및 스터디 ID 전달

### Task 5: API 호출 및 상태 관리
- [ ] React Query 또는 SWR을 사용한 멤버 기여도 데이터 페칭
- [ ] 로딩 상태 처리 (스켈레톤 UI)
- [ ] 에러 상태 처리 및 에러 메시지 표시
- [ ] 모달 열릴 때만 데이터 페칭 (성능 최적화)

### Task 6: 테스트 작성
- [ ] `apps/frontend/src/domains/ranking/tests/StudyDetailModal.test.tsx` 생성
- [ ] 모달 열기/닫기 테스트
- [ ] 멤버 리스트 렌더링 테스트
- [ ] 멤버 클릭 시 프로필 라우팅 테스트
- [ ] API 호출 및 에러 처리 테스트
- [ ] ESC 키 이벤트 테스트

---

## 📝 Technical Notes

### API Endpoint
- `GET /api/ranks/{studyId}/members` (또는 기존 `/api/ranks` 응답의 `members` 필드 활용)
- Response: `ApiResponse<List<StudyMemberContributionResponse>>`
- `StudyMemberContributionResponse` 구조 (예상):
  ```typescript
  {
    userId: number;
    nickname: string;
    profileImg: string;
    role: 'OWNER' | 'MEMBER';
    contributionPoint: number; // 멤버의 기여 점수
    rank: number; // 스터디 내 순위
  }
  ```

**참고**: 현재 `RankResponse`에 이미 `members: StudyMemberResponse[]` 필드가 있으므로, 추가 API 없이 기존 응답을 활용할 수 있습니다. 다만 멤버별 기여 점수와 순위 정보가 필요하다면 별도 API가 필요할 수 있습니다.

### 컴포넌트 구조
```
domains/ranking/
├── components/
│   ├── StudyDetailModal.tsx      # 상세 모달
│   └── MemberContributionList.tsx # 멤버 기여도 리스트
└── tests/
    └── StudyDetailModal.test.tsx
```

### 디자인 고려사항
- 모달은 중앙에 배치하고 적절한 크기로 설정
- 멤버 리스트는 순위가 명확하게 보이도록 시각화
- 방장 뱃지는 눈에 띄는 색상 또는 아이콘 사용
- 프로필 이미지는 Avatar 컴포넌트 활용
- Shadcn/UI Dialog, Avatar, Badge 컴포넌트 활용

### 프로필 라우팅
- Next.js `useRouter`를 사용하여 `/profile/{nickname}`로 이동
- `router.push(`/profile/${member.nickname}`)` 사용

---

## 🔗 Related Stories
- S8-1: 스터디 랭킹 보드 (Frontend) - 랭킹 보드에서 모달 트리거
- S8-3: 스터디 랭킹 조회 API (Backend) - 멤버 기여도 API (필요시)
