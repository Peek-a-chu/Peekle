# Epic-00: 프로젝트 초기화 및 인프라 (Project Initialization & Infrastructure)

## 📌 Overview
이 문서는 Peekle의 **프로젝트 초기화** 단계에 대한 전체 에픽 및 스토리 세부 내역을 제공합니다. Frontend, Backend 및 DevOps 인프라 설정을 다룹니다.

## 📋 Stories

### 00.1. 프로젝트 초기 설정 (Frontend)
**User Story**
> **프론트엔드 개발자**로서, **Tailwind와 Shadcn/UI로 Next.js 프로젝트를 초기화**하고 싶다.
> 팀이 UI 컴포넌트를 구축할 표준 기반을 갖게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] Next.js 15 + TypeScript 프로젝트 구조가 생성되어야 한다.
- [ ] 코드를 커밋할 때 Prettier 및 ESLint (Strict) 규칙이 강제되어야 한다.
- [ ] GitHub Actions에서 main에 푸시하면 빌드 및 린트 검사가 통과해야 한다.

**🛠 Implementation Tasks**
- [ ] `create-next-app`으로 프로젝트 초기화
- [ ] TailwindCSS 및 Shadcn/UI 설치 및 설정
- [ ] Husky 및 lint-staged 설정
- [ ] GitHub Actions workflow 파일 작성 (`build.yml`)

### 00.2. 프로젝트 초기 설정 (Backend)
**User Story**
> **백엔드 개발자**로서, **필요한 의존성으로 Spring Boot 프로젝트를 설정**하고 싶다.
> API 구축을 시작할 수 있어야 하기 때문이다.

**✅ Acceptance Criteria**
- [ ] Spring Boot 3.x 애플리케이션이 성공적으로 실행되어야 한다.
- [ ] `docker-compose up` 실행 시 Redis 컨테이너가 정상 작동해야 한다.
- [ ] 외부 서버에서 제공되는 MySQL 데이터베이스 연결이 성공해야 한다.
- [ ] 전역 에러 처리 및 공통 DTO 패턴이 수립되어야 한다.

**🛠 Implementation Tasks**
- [ ] Spring Initializr로 프로젝트 생성 (Web, JPA, Lombok, Validation)
- [ ] `docker-compose.yml` 작성 (Redis)
- [ ] GlobalExceptionHandler 구현
- [ ] `ApiResponse` 공통 DTO 클래스 작성

### 00.3. Jenkins CI/CD 설정 (DevOps)
**User Story**
> **DevOps 엔지니어**로서, **Jenkins를 배포하고 GitLab 저장소에 연결**하고 싶다.
> 코드 푸시가 자동으로 빌드 및 테스트를 트리거하게 하기 위함이다.

**✅ Acceptance Criteria**
- [ ] Jenkins 서버에 접근 가능해야 한다.
- [ ] GitLab 저장소로부터 Push 이벤트를 정상적으로 수신해야 한다.
- [ ] `Jenkinsfile` 파이프라인이 Frontend/Backend에 대해 Build 및 Test 단계를 실행해야 한다.

**🛠 Implementation Tasks**
- [ ] Docker로 Jenkins 컨테이너 배포
- [ ] Jenkins GitLab 플러그인 및 Credential 설정
- [ ] `Jenkinsfile` 작성 (Stage: Checkout -> Build -> Test)

### 00.4. MatterMost 알림 봇 (DevOps)
**User Story**
> **팀원**으로서, **MatterMost에서 빌드 알림**을 받고 싶다.
> 빌드가 실패했는지 즉시 알기 위함이다.

**✅ Acceptance Criteria**
- [ ] MatterMost Incoming Webhook URL이 생성되어야 한다.
- [ ] Jenkins 빌드 성공/실패 시 상태와 링크가 포함된 메시지가 채널에 게시되어야 한다.

**🛠 Implementation Tasks**
- [ ] MatterMost 채널 생성 및 Webhook 설정
- [ ] Jenkins 파이프라인 `post { success/failure }` 블록에 알림 스크립트 추가

### 00.5. WebRTC 인프라 (Coturn) (DevOps)
**User Story**
> **사용자**로서, **내 비디오 트래픽을 릴레이할 TURN 서버**가 필요하다.
> 엄격한 방화벽 뒤에 있어도 스터디 룸에 연결할 수 있어야 하기 때문이다.

**✅ Acceptance Criteria**
- [ ] Coturn 서버가 표준 STUN/TURN 포트에서 수신 대기해야 한다.
- [ ] WebRTC trickle 테스터로 테스트 시 유효한 Relay 후보를 반환해야 한다.
- [ ] OpenVidu 서버가 외부 Coturn 서버를 사용하도록 설정되어야 한다.

**🛠 Implementation Tasks**
- [ ] Coturn Docker 컨테이너 배포 및 `turnserver.conf` 설정
- [ ] OpenVidu 설정 파일(`AWS_URL`, `COTURN_IP`) 업데이트
- [ ] 연결 테스트 수행
