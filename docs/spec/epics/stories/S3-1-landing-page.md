# S3-1. 랜딩 페이지 (Frontend)

## 📌 Story Information
- **Epic**: Epic-03 (Auth & Onboarding)
- **Story ID**: S3-1
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 1 day
- **Priority**: High
- **Dependencies**: S2-1 (Frontend Setup)

---

## 🧾 User Story

**As a** 방문자
**I want to** 서비스에 대한 소개를 보고 로그인할 수 있는 진입점이 필요하다
**So that** 서비스가 무엇인지 파악하고 회원가입/로그인을 시작하기 위함이다

---

## ✅ Acceptance Criteria

1. ✓ 랜딩 페이지(`/`)에서 서비스 한 줄 소개 및 핵심 기능이 나열되어야 한다
2. ✓ "로그인" 버튼 클릭 시 `/login` 페이지로 이동해야 한다
3. ✓ 깔끔하고 매력적인 UI로 사용자의 첫인상을 긍정적으로 만들어야 한다

---

## 🛠 Implementation Tasks

### Task 1: 랜딩 페이지 레이아웃 구현

**파일 생성:**
- `app/page.tsx` - 메인 랜딩 페이지 컴포넌트

**구현 요구사항:**
- Next.js App Router 사용
- Shadcn/UI 컴포넌트 활용 (Button, Card)
- Lucide React 아이콘 사용
- Arrow function 패턴으로 컴포넌트 작성

### Task 2: 히어로 섹션 디자인

**디자인 요구사항:**
- **헤드라인**: "Peekle" - 크고 명확한 서비스명
- **서브헤딩**: 서비스 한 줄 소개 (예: "알고리즘 스터디와 코딩 게임으로 함께 성장하는 개발자 커뮤니티")
- **CTA 버튼**: "시작하기" (Primary) + "더 알아보기" (Secondary)
- **배경**: 그라데이션 또는 subtle 패턴

**추가 개선 사항 (선택):**
- 애니메이션 효과 (fade-in, slide-up)
- 일러스트 또는 스크린샷 배치
- 사용자 수, 문제 수 등 통계 표시

### Task 3: 핵심 기능 카드 구현

**4가지 핵심 기능:**

1. **실시간 스터디룸**
   - 아이콘: Users
   - 설명: "화상 채팅과 코드 공유로 함께 문제를 풀어보세요"

2. **코딩 게임**
   - 아이콘: Target
   - 설명: "스피드 레이스와 팀전으로 실력을 겨뤄보세요"

3. **리그 시스템**
   - 아이콘: Trophy
   - 설명: "주간 점수로 승급하고 랭킹을 올려보세요"

4. **AI 추천**
   - 아이콘: Code
   - 설명: "내 실력에 맞는 문제를 AI가 추천해드립니다"

**컴포넌트 구성:**
- `FeatureCard` 컴포넌트 생성
- Props: icon, title, description
- Hover 효과 추가 (shadow-lg transition)

### Task 4: 라우팅 연결

**Next.js App Router 설정:**
- Next.js Link 컴포넌트 사용
- 로그인 버튼: `/login` 페이지로 이동
- "더 알아보기" 버튼: `#features` 앵커 스크롤

**네비게이션 테스트:**
1. `/` 접속
2. "시작하기" 버튼 클릭 → `/login` 이동 확인
3. "더 알아보기" 클릭 → 기능 섹션으로 스크롤 확인

### Task 5: 반응형 레이아웃

**Tailwind 반응형 설정:**
- 모바일: 1열 (기본)
- 태블릿: 2열 (`md:grid-cols-2`)
- 데스크탑: 4열 (`lg:grid-cols-4`)
- 컨테이너 최대 너비 및 패딩 설정

**테스트 해상도:**
- 모바일: 375px
- 태블릿: 768px
- 데스크탑: 1280px

### Task 6: 다크 모드 지원

**테마 전환 확인:**
- Shadcn/UI 테마 변수 사용
- 배경 그라데이션: `from-background to-muted`
- 텍스트 색상: `text-foreground`, `text-muted-foreground`

**다크 모드 테스트:**
1. 라이트 모드에서 확인
2. 다크 모드로 전환
3. 색상 대비 및 가독성 확인

---

## 🧪 Testing & Validation

### 1. 페이지 로딩 테스트
- http://localhost:3000 접속
- 페이지가 정상적으로 렌더링되는지 확인

### 2. 버튼 클릭 테스트
- "시작하기" 버튼 → `/login` 이동
- "더 알아보기" 버튼 → 스크롤 이동
- "로그인" 버튼 (CTA) → `/login` 이동

### 3. 반응형 테스트
- Chrome DevTools → Device Toolbar
- 다양한 해상도에서 레이아웃 확인:
  - iPhone SE (375px)
  - iPad (768px)
  - Desktop (1920px)

### 4. 다크 모드 테스트
- 시스템 테마 변경 또는 테마 토글 사용
- 모든 요소가 읽기 쉬운지 확인

### 5. 접근성 테스트
- Lighthouse 검사 (Chrome DevTools)
- Performance, Accessibility, Best Practices, SEO 점수 확인

---

## 📦 Deliverables

- [ ] `app/page.tsx` - 랜딩 페이지 메인
- [ ] 히어로 섹션 (제목, 부제, CTA)
- [ ] 핵심 기능 섹션 (4개 카드)
- [ ] CTA 섹션 (로그인 유도)
- [ ] Footer
- [ ] 반응형 레이아웃
- [ ] 다크 모드 지원
- [ ] `/login` 라우팅 연결

---

## 🎨 디자인 가이드라인

### 색상
- **Primary**: Accent color (사용자 선택)
- **Background**: `bg-background`
- **Muted**: `bg-muted` (섹션 구분)
- **Text**: `text-foreground`, `text-muted-foreground`

### 타이포그래피
- **H1**: `text-5xl font-bold` - 서비스명
- **H2**: `text-3xl font-bold` - 섹션 제목
- **Body**: `text-xl` - 부제
- **Description**: `text-muted-foreground` - 설명

### 간격
- **Section Padding**: `py-16` 또는 `py-20`
- **Card Gap**: `gap-6`
- **Button Size**: `size-lg`

### 애니메이션 (선택사항)
- Framer Motion 사용 권장
- fade-in, slide-up 효과
- 부드러운 트랜지션 (duration: 0.5s)

---

## 📚 Related Documents
- [Spec Document](../../spec.md) - 5.1 랜딩 페이지
- [Epic-03: Auth](../epic-02-auth.md)
- [S2-1: Frontend Setup](./S2-1-frontend-setup.md)

---

## 🔗 References
- [Next.js App Router](https://nextjs.org/docs/app)
- [Shadcn/UI Components](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Tailwind CSS Gradient](https://tailwindcss.com/docs/gradient-color-stops)
