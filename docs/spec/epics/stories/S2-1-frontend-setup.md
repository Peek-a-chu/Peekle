# S2-1. 프로젝트 초기 설정 (Frontend)

## 📌 Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-1
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 1-2 days
- **Priority**: Critical
- **Dependencies**: None

---

## 🧾 User Story

**As a** 프론트엔드 개발자
**I want to** Tailwind와 Shadcn/UI로 Next.js 프로젝트를 초기화하고 싶다
**So that** 팀이 UI 컴포넌트를 구축할 표준 기반을 갖게 하기 위함이다

---

## ✅ Acceptance Criteria

1. ✓ Next.js 15 + TypeScript 프로젝트 구조가 생성되어야 한다
2. ✓ 코드를 커밋할 때 Prettier 및 ESLint (Strict) 규칙이 강제되어야 한다
3. ✓ Jenkins CI에서 main에 푸시하면 빌드 및 린트 검사가 통과해야 한다

---

## 🛠 Implementation Tasks

### Task 1: pnpm 설치 및 Next.js 프로젝트 초기화
```bash
# pnpm 설치 (글로벌)
npm install -g pnpm@10.28.1

# pnpm 버전 확인
pnpm --version

# apps/frontend 디렉토리에서 실행
pnpm create next-app@latest . --typescript --tailwind --app --src-dir
```

**설정 옵션:**
- ✓ TypeScript: Yes
- ✓ ESLint: Yes
- ✓ Tailwind CSS: Yes
- ✓ `src/` directory: Yes
- ✓ App Router: Yes
- ✓ Import alias (@/*): Yes

**예상 결과:**
```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   └── lib/
├── public/
├── package.json
├── pnpm-lock.yaml    # pnpm lockfile
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### Task 2: Shadcn/UI 설치 및 설정
```bash
# Shadcn/UI CLI 설치
pnpm dlx shadcn-ui@latest init

# 기본 컴포넌트 설치 (예시)
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add input
pnpm dlx shadcn-ui@latest add dialog
pnpm dlx shadcn-ui@latest add dropdown-menu
pnpm dlx shadcn-ui@latest add tabs
pnpm dlx shadcn-ui@latest add toast
```

**components.json 설정:**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Task 3: Prettier 설정
```bash
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

**`.prettierrc` 파일 생성:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**`.prettierignore` 파일 생성:**
```
.next
node_modules
dist
build
pnpm-lock.yaml
```

### Task 4: ESLint (Strict) 설정
**`.eslintrc.json` 업데이트:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**필요 패키지 설치:**
```bash
pnpm add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Task 5: Husky 및 lint-staged 설정
```bash
# Husky 설치 및 초기화
pnpm add -D husky lint-staged
pnpm exec husky install

# package.json에 prepare 스크립트 추가
pnpm pkg set scripts.prepare="husky install"

# Pre-commit hook 생성
pnpm exec husky add .husky/pre-commit "pnpm exec lint-staged"
```

**`package.json`에 lint-staged 설정 추가:**
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

### Task 6: .gitlab-ci.yml 작성 (GitLab CI)
**`.gitlab-ci.yml` 파일 생성 (프로젝트 루트):**
```yaml
# GitLab CI/CD Configuration for Peekle
# Jenkins가 주 CI/CD 도구이지만, GitLab CI를 통한 간단한 검증도 가능

stages:
  - lint
  - build

# Frontend 린트 및 빌드는 Jenkins Jenkinsfile에서 처리
# 이 파일은 GitLab 내장 CI를 사용하려는 경우에만 활성화

frontend-lint:
  stage: lint
  image: node:20-alpine
  only:
    changes:
      - apps/frontend/**/*
  before_script:
    - cd apps/frontend
    - npm install -g pnpm@10.28.1
    - pnpm install --frozen-lockfile
  script:
    - pnpm run lint
    - pnpm run format:check
    - pnpm run type-check
  cache:
    paths:
      - apps/frontend/node_modules/

frontend-build:
  stage: build
  image: node:20-alpine
  only:
    changes:
      - apps/frontend/**/*
  before_script:
    - cd apps/frontend
    - npm install -g pnpm@10.28.1
    - pnpm install --frozen-lockfile
  script:
    - pnpm run build
  artifacts:
    paths:
      - apps/frontend/.next
    expire_in: 7 days
  cache:
    paths:
      - apps/frontend/node_modules/
```

**참고:** 실제 CI/CD는 Jenkins(S2-3)를 통해 처리됩니다. 위 파일은 선택사항입니다.

### Task 7: package.json scripts 정리
**`package.json`에 유용한 스크립트 추가:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "prepare": "husky install"
  }
}
```

---

## 🧪 Testing & Validation

### Manual Testing
1. **프로젝트 실행 확인:**
   ```bash
   cd apps/frontend
   pnpm install
   pnpm run dev
   ```
   → http://localhost:3000 접속 시 Next.js 기본 페이지 표시

2. **Lint 검사:**
   ```bash
   pnpm run lint
   ```
   → 에러 없이 통과

3. **타입 체크:**
   ```bash
   pnpm run type-check
   ```
   → TypeScript 에러 없음

4. **빌드 테스트:**
   ```bash
   pnpm run build
   ```
   → `.next` 디렉토리 생성 성공

### Git Hook Testing
1. **Pre-commit hook 테스트:**
   ```bash
   # 의도적으로 포맷 틀리게 작성
   echo "const x=1" > src/test.ts
   git add src/test.ts
   git commit -m "test"
   ```
   → Prettier가 자동으로 포맷 수정

2. **ESLint 에러 테스트:**
   ```typescript
   // src/test.ts
   const unusedVar = 123; // ESLint error
   ```
   → Commit 실패해야 함

### Jenkins CI Testing
1. **Feature 브랜치 생성 및 푸시:**
   ```bash
   git checkout -b feature/test-frontend-ci
   git push origin feature/test-frontend-ci
   ```
   → Jenkins에서 자동으로 빌드 트리거 확인

2. **Merge Request 생성:**
   → GitLab MR에서 Jenkins CI 체크 통과 확인
   → MatterMost 알림 수신 확인

---

## 📦 Deliverables

- [ ] pnpm 패키지 매니저 설정
- [ ] Next.js 15 + TypeScript 프로젝트 구조
- [ ] Tailwind CSS 설정 완료
- [ ] Shadcn/UI 초기 컴포넌트 설치
- [ ] ESLint + Prettier 설정
- [ ] Husky + lint-staged 설정
- [ ] GitLab CI 설정 (선택사항, Jenkins가 주 CI)
- [ ] README.md (프로젝트 실행 방법 안내)

---

## 📚 Related Documents
- [Architecture Design](../../architecture.md)
- [Sprint Plan](../../sprint-plan.md)
- [Epic-02: Infrastructure](../epic-01-infra.md)

---

## 🔗 References
- [pnpm Documentation](https://pnpm.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Husky Documentation](https://typicode.github.io/husky/)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
