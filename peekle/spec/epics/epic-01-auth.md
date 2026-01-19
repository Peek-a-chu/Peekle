# Epic-01: 인증 및 온보딩 (Authentication & Onboarding)

## 📌 Overview
이 문서는 **인증 및 온보딩**에 대한 전체 에픽 및 스토리 세부 내역을 제공합니다. OAuth 2.0 기반 소셜 로그인(Google, Kakao, Naver)과 초기 프로필 설정 과정을 다룹니다.

## 📋 Stories

### 01.1. 소셜 로그인 UI (Frontend)
**User Story**
> **게스트 사용자**로서, **Google, Naver 또는 Kakao 계정을 사용하여 로그인**하고 싶다.
> 새로운 비밀번호를 기억하지 않고 플랫폼에 액세스하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 로그인 페이지에 "Google로 로그인", "Kakao로 로그인", "Naver로 로그인" 버튼이 노출되어야 한다.
- [ ] 각 버튼 클릭 시 해당 플랫폼의 OAuth 인증 페이지로 리다이렉트되어야 한다.
- [ ] 로그인 성공 콜백 시, 신규 유저는 `/signup`(닉네임 설정), 기존 유저는 `/home`으로 이동해야 한다.

**🛠 Implementation Tasks**
- [ ] 로그인 페이지(`LoginPage.tsx`) UI 구현
- [ ] 각 소셜 버튼 컴포넌트 및 아이콘 추가
- [ ] OAuth 리다이렉트 URL 처리 로직 구현

### 01.2. OAuth2 통합 (Backend)
**User Story**
> **시스템**으로서, **Google/Naver/Kakao를 통해 신원을 확인**하고 싶다.
> 사용자의 이메일 정보를 신뢰하고 간편하게 인증하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 앱 시작 시 OAuth Client ID/Secret이 정상적으로 로드되어야 한다.
- [ ] 제공자(Provider)로부터 액세스 토큰 및 사용자 정보(이메일, 프로필)를 받아와야 한다.
- [ ] DB에 이메일 존재 여부를 확인하여 신규/기존 회원 분기 처리를 해야 한다.

**🛠 Implementation Tasks**
- [ ] Spring Security OAuth2 Client 의존성 추가
- [ ] `application.yml`에 Google, Kakao, Naver 등록 정보 설정
- [ ] `OAuth2UserService` 커스텀 구현 (UserInfo 추출 및 DB 조회)

### 01.3. 닉네임 설정 폼 (Frontend)
**User Story**
> **신규 사용자**로서, **고유한 닉네임을 설정**하고 싶다.
> 커뮤니티에서 나를 식별할 수 있게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 닉네임 입력 시 디바운스(debounce) 처리되어 실시간 중복 확인이 수행되어야 한다.
- [ ] 유효하지 않은 닉네임(특수문자 포함 등) 입력 시 즉시 에러 메시지가 표시되어야 한다.
- [ ] 중복되지 않은 유효한 닉네임일 경우에만 "가입 완료" 버튼이 활성화되어야 한다.

**🛠 Implementation Tasks**
- [ ] 회원가입 페이지(`SignupPage.tsx`) 폼 구현
- [ ] 닉네임 유효성 검사 정규식(Regex) 적용
- [ ] 닉네임 중복 확인 API 연동 (`useDebounce` 훅 활용)

### 01.4. 사용자 관리 API (Backend)
**User Story**
> **클라이언트 애플리케이션**으로서, **사용자를 생성하고 조회하는 API**가 필요하다.
> 회원가입 흐름을 완료하고 사용자 정보를 관리하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `POST /api/v1/users/signup`: 닉네임 업데이트 및 계정 활성화가 수행되어야 한다.
- [ ] `GET /api/v1/users/check-nickname`: 닉네임 사용 가능 여부(Boolean)를 반환해야 한다.
- [ ] 닉네임 중복 시 409 Conflict 에러를 반환해야 한다.

**🛠 Implementation Tasks**
- [ ] `User` 엔티티 설계 (UserRole, Provider 등)
- [ ] `UserRestController` 및 `UserService` 구현
- [ ] 닉네임 중복 체크 쿼리 메소드 작성 (`existsByNickname`)

### 01.5. 확장 프로그램 설치 확인 (Frontend)
**User Story**
> **사용자**로서, **브라우저 확장 프로그램이 설치되어 있는지** 알고 싶다.
> 미설치 시 설치 안내를 받아야 서비스(문제 풀이 감지)를 이용할 수 있기 때문이다.

**✅ Acceptance Criteria**
- [ ] 앱 로드 시 `postMessage`로 확장 프로그램과 핸드셰이크를 시도해야 한다.
- [ ] 응답이 없을 경우, 방 입장 시도 시 "확장 프로그램을 설치해주세요" 모달이 나타나야 한다.
- [ ] 모달에는 크롬 웹 스토어 설치 링크가 포함되어야 한다.

**🛠 Implementation Tasks**
- [ ] `useExtensionCheck` 커스텀 훅 구현
- [ ] 설치 안내 모달 컴포넌트 구현
- [ ] `window.postMessage` 통신 로직 작성

### 01.6. JWT 서비스 & 보안 설정 (Backend)
**User Story**
> **시스템**으로서, **JWT 토큰을 발급하고 검증**하고 싶다.
> 무상태(stateless) 인증을 유지하여 서버 확장성을 확보하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 로그인 성공 시 `JwtTokenProvider`가 Access(단기) 및 Refresh(장기) 토큰을 발급해야 한다.
- [ ] 보안 엔드포인트 요청 시 `JwtAuthenticationFilter`가 헤더의 토큰을 검증해야 한다.
- [ ] Refresh Token으로 Access Token 재발급(Rotate)이 가능해야 한다.

**🛠 Implementation Tasks**
- [ ] `io.jsonwebtoken` 라이브러리 추가
- [ ] `JwtTokenProvider` 클래스 구현 (생성, 검증, 파싱)
- [ ] Spring Security `SecurityFilterChain` 설정 (CSRF 비활성화, 필터 등록)
