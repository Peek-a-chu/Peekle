---
applyTo: 'apps/frontend'
---
## 1. 설계 원칙 (Design Principles)

### 추상화와 구현 상세의 분리 (Abstraction)

복잡한 로직이나 상호작용은 전용 컴포넌트나 훅(Wrapper/HOC)으로 감싸서, 상위 컴포넌트는 **'어떻게(How)'가 아니라 '무엇(What)'을 하는지**만 보여주도록 합니다.

- 인증 체크, 다이얼로그 처리 등 복잡한 로직은 래퍼(Wrapper) 컴포넌트로 추상화하여 인지 부하를 줄입니다.

```jsx
// 인증 체크 로직을 AuthGuard라는 래퍼 컴포넌트에 위임
function App() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
```

### 조건부 렌더링의 분리 (Separating Code Paths)

역할(Role)이나 상태에 따라 UI나 로직이 크게 달라진다면, 하나의 컴포넌트 안에서 `if/else`나 삼항 연산자로 처리하기보다 **별도의 컴포넌트로 분리**합니다.

- **규칙:** 서로 다른 책임(예: 관리자 vs 뷰어)을 가진 UI는 별도 컴포넌트로 분기하여 가독성을 높입니다.

```jsx
function SubmitButton() {
  const isViewer = useRole() === "viewer";
  // 역할에 맞는 전용 컴포넌트를 렌더링
  return isViewer ? <ViewerSubmitButton /> : <AdminSubmitButton />;
}

// 각 컴포넌트는 자신의 역할에만 집중
function ViewerSubmitButton() { return <TextButton disabled>Submit</TextButton>; }
function AdminSubmitButton() { return <Button type="submit">Submit</Button>; }
```

### 상태 관리의 스코핑 (State Scoping)

상태 관리를 비대하게 만들지 않고, **필요한 상태만 관리하는 작은 단위의 훅(Hook)**으로 쪼갭니다.

- **규칙:** 컴포넌트가 불필요한 상태(데이터)에 의존하지 않도록, 상태 관리 훅을 기능별로 잘게 나눕니다.

```jsx
// 특정 쿼리 파라미터(cardId)만 관리하는 전용 훅 사용
export function useCardIdQueryParam() {
  const [cardIdParam, setCardIdParam] = useQueryParam("cardId", NumberParam);
  // ...
  return [cardIdParam, setCardId];
}
// 컴포넌트는 정확히 필요한 훅만 가져다 씀
```

### Props Drilling 방지 (Composition)

Props를 여러 단계 거쳐 전달해야 한다면, 중간 컴포넌트를 거치지 않고 **컴포넌트 합성(Composition)**을 활용합니다.

- **규칙:** 불필요한 중간 전달자를 없애기 위해 `children`이나 직접 렌더링 방식을 사용하여 결합도를 낮춥니다

```jsx
// ✅ Modal 내부에 필요한 Input을 직접 렌더링하여 Props 전달 단계 삭제
<Modal open={open} onClose={onClose}>
  <div style={{...}}>
    <Input 
      value={keyword} 
      onChange={(e) => setKeyword(e.target.value)} // 상태를 직접 주입
    />
    <Button onClick={onClose}>Close</Button>
  </div>
</Modal>
```

### 폼 응집도 고려 (Form Cohesion)

폼의 요구사항에 따라 필드 단위(Field-Level)와 폼 단위(Form-Level) 중 적절한 응집도 전략을 선택합니다.

- **Field-Level (필드 단위):** 유효성 검사 로직이 서로 독립적이거나 재사용성이 중요한 경우, 각 입력 필드 컴포넌트 내부에 검증 로직을 위치시킵니다.
- **Form-Level (폼 단위):** 필드 간 의존성이 있거나(예: 비밀번호 확인), 전체 폼의 흐름이 중요한 경우 `Zod`와 같은 스키마 라이브러리를 사용하여 한곳에서 중앙 집중적으로 관리합니다.

```jsx
// Form-Level 예시 (Zod 스키마 사용)
const schema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  email: z.string().email("유효한 이메일이 아닙니다."),
});
// 스키마 하나로 폼 전체의 응집도를 높임
```

---

## 2. 네이밍 규칙 (Naming Conventions)

### camelCase

첫 단어는 소문자로 시작, 이후 단어의 첫 글자는 대문자로 씁니다.

- **변수명:** `const isHistoryPage = ...;`
- **함수명:** `const handleClickResultButton = () => {};`
- **React 커스텀 훅:** `const useCabinetData = () => {};`
- **개체 속성명 (interface, type):**
    
    ```jsx
    interface UserData {
      name: string | null;
      isVisible: boolean;
    }
    ```
    
- **폴더/파일 명 (api, hooks, icons 등 유틸리티):**
    - `fetchInterceptApi.tsx` (api 폴더)
    - `angleDown.svg` (icons 폴더)
    - `useLogin.tsx` (hooks 폴더)

### PascalCase

모든 단어의 첫 글자를 대문자로 씁니다.

- **객체 명 (Interface, Type 정의):** `interface UserData { ... }`
- **리액트 컴포넌트 명:** `const BuildingSelectButton = () => {};`
- **폴더/파일 명 (페이지, 컴포넌트):**
    - `BuildingSelectButton.tsx` (컴포넌트)
    - `ProfilePage.tsx` (페이지)
    - **Note:** 컴포넌트 파일명에는 SSR/CSR 여부에 따라 접두사를 붙입니다.
      - **Server Component:** `SC` (예: `SCUserList.tsx`)
      - **Client Component:** `CC` (예: `CCUserProfile.tsx`)

### SNAKE_CASE

대문자로 작성하며 단어 간에는 `_` 로 구분합니다.

- **상수 및 환경 변수:**

```jsx
const BASE_URL = 'https://api.example.com';
const API_KEY = process.env.API_KEY;
```

---

## 3. 함수 및 변수 (Function & Variables)

### 함수 작명 규칙

함수의 이름은 의미 있는 동사로 시작하여, 이름만 보고도 역할을 알 수 있어야 합니다.

- **`handle`**: 이벤트를 핸들링하는 내부 함수 (`handleLoginButton`)
- **`on`**: Props로 전달되는 이벤트 리스너 함수 (`onSubmit`)
- **`is`**: 반환값이 Boolean인 함수 (`isNot` 등 부정형 지양)
- **`get`**: 값을 계산하거나 가져와서 반환하는 함수 (`getStatusColor`)
- **`fetch`**: API 요청 등 비동기 함수 (`fetchCabinetDetailInformation`)

### 선언 방식

- **화살표 함수**를 기본으로 사용합니다.
    
    ```jsx
    const sum = (a, b) => a + b;
    ```
    

### 변수

- `var`는 사용하지 않으며, `const`와 `let`을 사용합니다.
- 배열 변수는 끝에 `List`를 붙입니다. (예: `userList`)
- 지나친 줄임말은 지양합니다. (예: `statNm` (X) -> `stationName` (O))
- **상태 변수:** 길어져도 의미를 명확히 합니다.
    
    ```jsx
    const [selectedBuilding, setSelectedBuilding] = useState();
    ```
    

---

## 4. React & TypeScript

### 기본 규칙

- **Any 지양:** 난해한 경우가 아니라면 `any` 타입을 사용하지 않습니다.
- **Props 정의:** `interface`를 사용하여 명확히 정의합니다.
- **함수 타입:** 매개변수와 반환값 타입을 명시합니다.
- **컴포넌트 선언:** `React.FC` 대신 직접 정의하는 방식을 지향합니다.

```jsx
interface LoginApiProps {
  studentNumber: string;
  password: string;
}
const LoginApi = ({ studentNumber, password }: LoginApiProps) => { ... };
```

### 리턴 타입의 표준화 (Standardizing Return Types)

유사한 기능을 하는 함수나 훅은 일관된 반환 타입 구조를 유지하여 예측 가능성을 높입니다.

- **규칙:** 성공/실패 여부나 데이터를 포함하는 표준화된 객체(Discriminated Union 등)를 반환하도록 설계합니다.
- **이유:** 개발자가 반환값의 형태를 미리 예측할 수 있어 혼란과 에러를 줄일 수 있습니다

```jsx
type ValidationResult = { ok: true } | { ok: false; reason: string };

function checkIsAgeValid(age: number): ValidationResult {
  if (age < 18) return { ok: false, reason: "18세 이상이어야 합니다." };
  return { ok: true };
}

// 사용하는 쪽에서 ok 여부에 따라 안전하게 처리 가능
const result = checkIsAgeValid(age);
if (!result.ok) {
  console.error(result.reason);
}
```

### Client vs Server (Next.js)

- **Client Component:** `useState`, `useEffect`, 브라우저 이벤트(`onClick`) 등을 사용하는 컴포넌트는 파일 최상단에 `'use client';`를 명시합니다.
- Server Component:
    - SSR(ServerSide Rendering)의 경우 파일 최상단에 `‘import 'server-only’` 를 통해서 Client Component의 사용을 제한합니다.
- 파일 명명은 다음과 같이 접두사로 진행합니다
    - ServerComponent
        - `SCUserBox.tsx`
    - ClientComponent
        - `CCUserTask.tsx`

---

## 5. 프로젝트 구조 (Next.js App Router)

### 명명 규칙

- **kebab-case:** `app` 디렉토리 내부의 라우팅 폴더 (URL 경로와 일치해야 함)
- **camelCase:** `api`, `hooks`, `icons`, `lib` 등 기능/유틸리티 폴더
- **PascalCase:** `Components`, `Domains` 등 UI 및 비즈니스 로직 포함 폴더

### 구조 원칙

- **응집도(Cohesion):** 특정 기능(`Game`, `User`)과 관련된 모든 코드(UI, Hook, API)는 한 폴더에 모아둡니다.
- **재사용성(Reusability):** 2곳 이상의 도메인에서 공통으로 사용되는 것만 `Global` 영역(`src/Components`, `src/hooks`)으로 승격시킵니다.
- **Next.js 15:** 서버 액션(Server Actions)과 API 로직도 해당 도메인 폴더 내에 위치시킵니다.
    - **app 폴더:** 페이지와 레이아웃을 정의합니다. (소문자 폴더명 = URL)
    - **domains 폴더:** 기능/도메인별로 코드(컴포넌트, 훅 등)를 응집시킵니다.
    - **components 폴더:** 특정 도메인에 종속되지 않는 **공용 디자인 시스템** 컴포넌트만 위치합니다.

### Tree 구조 예시

```jsx
ROOT
├── public                   # [Static Assets] 외부에서 URL로 직접 접근 가능한 파일들
│   ├── images               # 예: og-image.png, robots.txt, favicon.ico
│   └── fonts                # (Local Font를 쓸 경우)
│
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css      # [Global CSS] Tailwind Directive (@tailwind base...) 포함
│   │
│   ├── assets               # [Shared Assets] 컴포넌트에서 import해서 쓰는 공용 이미지/아이콘
│   │   ├── images           # 예: logo.png, placeholder.jpg
│   │   └── icons            # (SVG 파일들)
│   │
│   ├── components           # [Shared UI]
│   │   └── button           # 예: className을 통해 Tailwind 적용
│   │
│   ├── domains              # [Features]
│   │   ├── game
│   │   │   ├── assets       #  game 도메인 전용 이미지/아이콘
│   │   │   │   └── card-sprite.png
│   │   │   ├── components
│   │   │   └── ...
│   │   └── user
│   │
│   └── lib                  # [Utils]
│       └── utils.ts         # Tailwind 병합 유틸리티 (cn 함수)
│
├── tailwind.config.ts       # [Config] Tailwind 설정 (Design Token 정의)
├── postcss.config.js        # [Config] PostCSS 설정
└── ...
```

### Import 순서

`React 내장` → `라이브러리(Next.js 포함)` → `내부 모듈` → `컴포넌트` → `스타일/이미지` 순으로 작성합니다.

```jsx
// 1. React 내장
import { useState, useEffect } from "react";

// 2. 라이브러리
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

// 3. 내부 모듈 (@ 경로 맵핑 활용)
import { userDataApi } from "@/api/userDataApi";
import { useCabinetData } from "@/hooks/useCabinetData";

// 4. 컴포넌트
import CabinetFooterMenuButton from "@/components/CabinetFooterMenuButton";

// 5. 스타일 및 이미지
import SearchSVG from "@/icons/search.svg?react";
```

---

## 6. 스타일 및 기타 규칙

### CSS

- **단위:** 반응형을 고려하여 `px` 대신 `rem` 또는 `em`을 권장합니다.
- **Tailwind:** 반응형 접두사(`ss`, `sm`)와 유틸리티 클래스를 적극 활용합니다.
- **레이아웃:** `flex`, `grid`, `gap`을 사용하여 유연하게 구성합니다.

### 문자열

- 기본적으로 **작은따옴표(')**를 사용합니다.

```jsx
const message = 'Hello, World!';
```

- **큰따옴표(")** 사용 예외:
    - HTML 속성: `<input type="text" />`
    - JSON 문자열: `'{"name": "user"}'`
    - 작은따옴표가 포함된 문자열: `"It's a good day"`

### 하드 코딩 방지

- URL, 매직 넘버 등은 상수(`const`)나 환경 변수(`process.env`)로 관리합니다.
- **이유:** 유지보수성 향상 및 값의 목적 파악 용이.

### 에러 처리

- 에러 처리는 비동기로 수행하며, `console.error`로 로깅합니다.
- 상태 코드와 에러 메시지를 통해 관리자가 쉽게 파악할 수 있도록 합니다.

### 분기 처리

- **switch-case:** 3개 이상의 값 평가 시 권장.
- **if / 삼항연산자:** 복잡한 조건은 `if`, 간단한 값 할당은 삼항연산자 사용.
- **조건부 렌더링:** `&&` 연산자보다는 삼항연산자를 권장합니다 (0이 렌더링되는 실수 방지).
    - **단, 중첩된 삼항 연산자는 가독성을 해치므로 지양하고 if문이나 별도 컴포넌트로 분리합니다.**
    
    ```jsx
    <div>{isLoggedIn ? <Dashboard /> : <Login />}</div>
    ```
    

### 기타

- URL 경로는 소문자(`lowercase`)를 사용합니다.
- TypeScript `enum` 대신 Union Type이나 객체(const assertion)를 사용합니다.
- 불필요한 `<div>` 래퍼 대신 Fragment `<>`를 사용합니다.
---

## 3. 추가 아키텍처 규칙 (Additional Architecture Rules)

### 3.1 절대 경로 사용 (Absolute Imports Only)

**Rule:** 모든 import 구문에서 상대 경로(`./`, `../`) 사용을 금지하고, 항상 **절대 경로(`@/...`)**를 사용합니다.

**Code Example:**
```typescript
// ❌ Bad
import { useRoomStore } from '../hooks/useRoomStore';
import { Button } from '../../components/ui/button';

// ✅ Good
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Button } from '@/components/ui/button';
```

### 3.2 로직과 뷰의 철저한 분리 (Strict Separation of Logic & View)

**Rule:** Page 컴포넌트와 일반 UI 컴포넌트 내부에서는 **절대 Hook(Store, API, State 등)을 직접 정의하거나 사용하지 않습니다.**
모든 비즈니스 로직과 상태 관리는 해당 컴포넌트를 위한 **전용 Custom Hook**으로 분리해야 합니다.

**Reasoning:**
- 컴포넌트는 오직 '그리는 것(Rendering)'에만 집중합니다.
- 로직의 재사용성과 테스트 용이성을 확보합니다.

**Recommended Pattern:**

```tsx
// 1. Logic (Hook)
// hooks/useMyFeature.ts
export function useMyFeature() {
  const data = useStore(state => state.data);
  const [localState, setLocalState] = useState(false);
  
  const handleClick = () => { /* ... */ };

  return { data, localState, handleClick };
}

// 2. View (Component)
// components/MyFeature.tsx
export function MyFeature() {
  // 훅을 통해 필요한 데이터와 함수만 구조분해 할당
  const { data, localState, handleClick } = useMyFeature();

  return (
    <div onClick={handleClick}>
      {data} - {localState ? 'On' : 'Off'}
    </div>
  );
}
```

### 3.3 폴더 네이밍 컨벤션 (Folder Naming)

**Rule:** `domains`, `components` 등 모든 폴더명은 **소문자(lowercase)**를 원칙으로 합니다. PascalCase(대문자 시작)는 사용하지 않습니다.

**Example:**
- `src/Domains/Study` (❌) -> `src/domains/study` (✅)
