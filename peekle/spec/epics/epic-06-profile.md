# Epic-06: 사용자 프로필 및 히스토리 (User Profile & History)

## 📌 Overview
이 문서는 **사용자 프로필 및 히스토리**에 대한 전체 에픽 및 스토리 세부 내역을 제공합니다. 사용자는 자신의 통계와 설정을 관리하고, 과거의 문제 해결 내역(코드 포함)을 조회할 수 있습니다.

## 📋 Stories

### 06.1. 프로필 UI (Frontend)
**User Story**
> **사용자**로서, **내 프로필 통계를 보고 설정을 관리**하고 싶다.
> 내 정보를 최신 상태로 유지하고 성과를 확인하기 위함이다.

**✅ Acceptance Criteria**
- [ ] 프로필 페이지 상단에 아바타, 닉네임, 현재 티어 배지가 표시되어야 한다.
- [ ] 내 전체 활동 요약(총 풀이 수, 승률 등)이 섹션별로 구분되어야 한다.

**🛠 Implementation Tasks**
- [ ] `ProfilePage` 레이아웃 구현
- [ ] 통계 대시보드 UI 컴포넌트 재사용

### 06.2. 히스토리 조회 API (Backend)
**User Story**
> **사용자**로서, **과거 제출 내역을 목록 형태로 조회**하고 싶다.
> 내가 푼 문제들과 결과를 다시 검토하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `GET /api/v1/users/{id}/history` 호출 시 페이지네이션된 제출 로그 목록을 반환해야 한다.
- [ ] 역정규화된 `problem_title`, `problem_tier` 정보를 포함하여 추가 조인 없이 효율적으로 조회해야 한다.
- [ ] 날짜별, 결과별(성공/실패) 필터링 옵션을 지원해야 한다.

**🛠 Implementation Tasks**
- [ ] `SubmissionLogRepository` 조회 메소드 작성 (`Pageable` 지원)
- [ ] 동적 쿼리(QueryDSL) 적용 (필터링 용)

### 06.3. 히스토리 목록 & 코드 뷰어 (Frontend)
**User Story**
> **사용자**로서, **과거에 푼 문제의 소스 코드를 다시** 보고 싶다.
> 내 풀이 방식을 복기하거나 개선점을 찾기 위함이다.

**✅ Acceptance Criteria**
- [ ] 히스토리 목록 테이블에 날짜, 문제 이름, 결과(성공여부), 사용 언어, 실행 시간이 표시되어야 한다.
- [ ] 특정 행을 클릭하면 모달이 열리고, 당시 제출했던 코드가 읽기 전용 에디터에 로드되어야 한다.
- [ ] 코드 복사 버튼이 제공되어야 한다.

**🛠 Implementation Tasks**
- [ ] `SubmissionTable` 컴포넌트 구현 (TanStack Table 활용 권장)
- [ ] `CodeViewerModal` 구현 (Monaco Editor ReadOnly 설정)

### 06.4. 확장 프로그램 보안 API (Backend)
**User Story**
> **시스템**으로서, **확장 프로그램 전용 토큰을 발급하고 검증**하고 싶다.
> 외부에서 들어오는 제출 신호가 조작되지 않았음을 보장하기 위함이다.

**✅ Acceptance Criteria**
- [ ] `POST /api/v1/users/extension-token` 요청 시 랜덤 UUID 토큰을 생성하여 반환해야 한다.
- [ ] DB에는 토큰 원문이 아닌 해시값(SHA-256 등)만 저장해야 한다.
- [ ] 확장 프로그램 요청 인터셉터에서 헤더의 토큰과 DB의 해시를 대조하여 유효성을 검증해야 한다.

**🛠 Implementation Tasks**
- [ ] 토큰 생성 및 해싱 유틸리티 구현
- [ ] `ExtensionAuthInterceptor` 구현
- [ ] 사용자 엔티티에 토큰 해시 필드 추가