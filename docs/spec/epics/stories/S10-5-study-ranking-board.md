# S8-1. 스터디 랭킹 보드 (Frontend)

## 📌 Story Information

- **Epic**: Epic-08 (Ranking)
- **Story ID**: S8-1 (Original: S11-1)
- **Sprint**: TBD
- **Estimated Effort**: 2-3 days
- **Priority**: Medium
- **Dependencies**: S8-3 (Backend API)
- **Status**: Ready

---

## 🧾 User Story

**As a** 사용자
**I want to** 전체 스터디 그룹 중 상위 그룹과 전체 순위를 보고 싶다
**So that** 어떤 스터디가 가장 활발하게 활동하는지 파악하고 경쟁심을 느끼기 위함이다

---

## ✅ Acceptance Criteria

1. **Top 3 포디움 표시**
   - 상위 3개 스터디를 포디움 형태로 강조 표시해야 한다
   - 1위는 중앙 상단, 2위는 좌측, 3위는 우측에 배치
   - 각 포디움에는 순위, 스터디 이름, 총 랭킹 포인트, 멤버 수가 표시되어야 한다

2. **랭킹 리스트 표시**
   - 4위부터의 스터디는 리스트 형태로 표시되어야 한다
   - 각 항목에는 순위, 스터디 이름, 총 랭킹 포인트, 멤버 수가 표시되어야 한다
   - 스터디 클릭 시 상세 모달이 열려야 한다 (S8-2에서 구현)

3. **페이지네이션**
   - 한 페이지에 10개씩 표시 (기본값)
   - 페이지 번호 또는 이전/다음 버튼으로 네비게이션 가능
   - 현재 페이지 하이라이트 표시

4. **로딩 상태**
   - 데이터 로딩 중에는 스켈레톤 UI 또는 로딩 인디케이터 표시

5. **에러 처리**
   - API 호출 실패 시 사용자에게 에러 메시지 표시

---

## 🛠 Implementation Tasks

### Task 1: 랭킹 페이지 라우트 및 레이아웃 설정
- [ ] `apps/frontend/src/app/(main)/ranking/page.tsx` 생성
- [ ] `(main)` 레이아웃 그룹에 포함되어 LNB 표시 확인
- [ ] 페이지 기본 구조 및 컨테이너 레이아웃 구현

### Task 2: 랭킹 API 클라이언트 함수 구현
- [ ] `apps/frontend/src/api/rankingApi.ts` 생성
- [ ] `getRankings(page, size, keyword?, scope?)` 함수 구현
- [ ] API 응답 타입 정의 (`RankResponse` 인터페이스)
- [ ] 에러 핸들링 로직 포함

### Task 3: TopThreePodium 컴포넌트 구현
- [ ] `apps/frontend/src/domains/ranking/components/TopThreePodium.tsx` 생성
- [ ] 포디움 레이아웃 구현 (1위 중앙 상단, 2위 좌측, 3위 우측)
- [ ] 각 포디움 아이템에 순위, 이름, 포인트, 멤버 수 표시
- [ ] 클릭 시 상세 모달 열기 기능 (S8-2 연동)
- [ ] 반응형 디자인 고려 (모바일에서는 리스트 형태로 변경 가능)

### Task 4: StudyRankingList 컴포넌트 구현
- [ ] `apps/frontend/src/domains/ranking/components/StudyRankingList.tsx` 생성
- [ ] 랭킹 리스트 아이템 컴포넌트 구현
- [ ] 각 아이템에 순위, 이름, 포인트, 멤버 수 표시
- [ ] 클릭 시 상세 모달 열기 기능 (S8-2 연동)
- [ ] 호버 효과 및 시각적 피드백

### Task 5: 페이지네이션 컴포넌트 구현
- [ ] `apps/frontend/src/domains/ranking/components/RankingPagination.tsx` 생성 또는 기존 Pagination 컴포넌트 활용
- [ ] 페이지 번호 표시 및 클릭 이벤트 처리
- [ ] 이전/다음 버튼 구현
- [ ] 현재 페이지 하이라이트 스타일링
- [ ] 총 페이지 수 계산 및 표시

### Task 6: StudyRankingBoard 페이지 통합
- [ ] `apps/frontend/src/domains/ranking/components/StudyRankingBoard.tsx` 생성
- [ ] TopThreePodium, StudyRankingList, RankingPagination 통합
- [ ] API 호출 및 상태 관리 (React Query 또는 SWR 사용 권장)
- [ ] 로딩 상태 처리 (스켈레톤 UI)
- [ ] 에러 상태 처리 및 에러 메시지 표시
- [ ] 페이지 변경 시 스크롤 상단으로 이동

### Task 7: 테스트 작성
- [ ] `apps/frontend/src/domains/ranking/tests/StudyRankingBoard.test.tsx` 생성
- [ ] TopThreePodium 렌더링 테스트
- [ ] StudyRankingList 렌더링 테스트
- [ ] 페이지네이션 동작 테스트
- [ ] API 호출 및 에러 처리 테스트
- [ ] 클릭 이벤트 테스트

---

## 📝 Technical Notes

### API Endpoint
- `GET /api/ranks?page=0&size=10&keyword=&scope=ALL`
- Response: `ApiResponse<Page<RankResponse>>`
- `RankResponse` 구조:
  ```typescript
  {
    rank: number;
    studyId: number;
    name: string;
    totalPoint: number;
    memberCount: number;
    members: StudyMemberResponse[];
  }
  ```

### 컴포넌트 구조
```
domains/ranking/
├── components/
│   ├── StudyRankingBoard.tsx      # 메인 페이지 컴포넌트
│   ├── TopThreePodium.tsx         # Top 3 포디움
│   ├── StudyRankingList.tsx       # 4위 이후 리스트
│   └── RankingPagination.tsx     # 페이지네이션
├── hooks/
│   └── useRankings.ts             # API 호출 훅 (선택사항)
└── tests/
    └── StudyRankingBoard.test.tsx
```

### 디자인 고려사항
- 포디움은 시각적으로 눈에 띄게 강조 (그라데이션, 그림자 효과 등)
- 랭킹 리스트는 깔끔하고 읽기 쉬운 테이블 또는 카드 형태
- Shadcn/UI 컴포넌트 활용 (Card, Badge, Avatar 등)
- Tailwind CSS로 스타일링

---

## 🔗 Related Stories
- S8-2: 스터디 랭킹 상세 (Frontend) - 상세 모달 구현
- S8-3: 스터디 랭킹 조회 API (Backend) - API 구현
