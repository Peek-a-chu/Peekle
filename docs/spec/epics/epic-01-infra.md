# Epic-02: 개발자로서, 안정적인 개발 및 배포 환경을 구축하고 싶다

## 📌 Overview
이 문서는 프로젝트의 기초가 되는 인프라 및 환경 설정에 대한 요구사항을 정의합니다. 개발팀과 운영팀은 효율적인 협업을 위해 자동화된 파이프라인과 안정적인 통신 서버를 구축해야 합니다.

## 📋 Stories

### S2-1. 프로젝트 초기 설정 (Frontend)
🧾User Story

프론트엔드 개발자로서, Tailwind와 Shadcn/UI로 Next.js 프로젝트를 초기화하고 싶다.

팀이 UI 컴포넌트를 구축할 표준 기반을 갖게 하기 위함이다.

✅ Acceptance Criteria

 Next.js 15 + TypeScript 프로젝트 구조가 생성되어야 한다.

 pnpm 패키지 매니저가 설정되어야 한다.

 코드를 커밋할 때 Prettier 및 ESLint (Strict) 규칙이 강제되어야 한다.

 Jenkins CI에서 main에 푸시하면 빌드 및 린트 검사가 통과해야 한다.

**🛠 Implementation Tasks**
[ ] pnpm 설치 및 `pnpm create next-app`으로 프로젝트 초기화
[ ] TailwindCSS 및 Shadcn/UI 설치 및 설정
[ ] Husky 및 lint-staged 설정
[ ] Jenkinsfile 작성 (Frontend 빌드 파이프라인)

### S2-2. 프로젝트 초기 설정 (Backend)
🧾User Story
백엔드 개발자로서, 필요한 의존성으로 Spring Boot 프로젝트를 설정하고 싶다.
API 구축을 시작할 수 있어야 하기 때문이다.

✅ Acceptance Criteria
 Spring Boot 3.4.x 애플리케이션이 성공적으로 실행되어야 한다.
 `docker compose up` 실행 시 Redis 컨테이너가 정상 작동해야 한다.
 외부 서버(Azure MySQL)에서 제공되는 MySQL 데이터베이스 연결이 성공해야 한다.
 전역 에러 처리 및 공통 DTO 패턴이 수립되어야 한다.

**🛠 Implementation Tasks**
[x] Spring Initializr로 프로젝트 생성 (Web, JPA, Lombok, Validation)
[x] `docker compose.yml` 작성 (Redis)
[x] GlobalExceptionHandler 구현
[x] `ApiResponse` 공통 DTO 클래스 작성

### S2-3. GitLab CI/CD 및 EC2 자동 배포 설정 (DevOps)
🧾User Story
DevOps 엔지니어로서, GitLab CI/CD를 통해 EC2에 자동 배포하고 싶다.
코드 푸시가 자동으로 빌드, 테스트 및 배포를 트리거하게 하기 위함이다.

✅ Acceptance Criteria
 GitLab CI/CD 파이프라인이 정상 작동해야 한다.
 master 브랜치 푸시 시 자동으로 린트 및 빌드가 실행되어야 한다.
 SSH를 통해 EC2 인스턴스에 Docker 컨테이너로 배포되어야 한다.
 Nginx 리버스 프록시를 통해 Frontend/Backend가 서비스되어야 한다.

**🛠 Implementation Tasks**
[x] Frontend Dockerfile 작성 (Multi-stage build)
[x] Backend Dockerfile 작성 (Spring Boot)
[x] docker-compose.prod.yml 작성 (Nginx, Frontend, Backend, Redis, OpenVidu, Coturn)
[x] Nginx 설정 파일 및 Dockerfile 작성 (SSL 자동 생성 로직 포함)
[x] `.gitlab-ci.yml` 작성 (lint -> build -> deploy stages)
[x] GitLab CI/CD Variables 설정 (SSH_PRIVATE_KEY, EC2_HOST, EC2_USER)
[ ] EC2 인스턴스 초기 설정 (Docker, Git 설치)
[x] 컨테이너 기반 SSL 인증서 자동 발급 및 적용 로직 구현 (i14a408.p.ssafy.io)

### S2-4. MatterMost 알림 봇 (DevOps)
🧾User Story

팀원으로서, MatterMost에서 빌드 알림을 받고 싶다.

빌드가 실패했는지 즉시 알기 위함이다.

✅ Acceptance Criteria

 MatterMost Incoming Webhook URL이 생성되어야 한다.

 Jenkins 빌드 성공/실패 시 상태와 링크가 포함된 메시지가 채널에 게시되어야 한다.

**🛠 Implementation Tasks**
[ ] MatterMost 채널 생성 및 Webhook 설정
[ ] Jenkins 파이프라인 `post { success/failure }` 블록에 알림 스크립트 추가

### S2-5. WebRTC 인프라 (Coturn) (DevOps)
🧾User Story

사용자로서, 내 비디오 트래픽을 릴레이할 TURN 서버가 필요하다.

엄격한 방화벽 뒤에 있어도 스터디 룸에 연결할 수 있어야 하기 때문이다.

✅ Acceptance Criteria

 Coturn 서버가 표준 STUN/TURN 포트에서 수신 대기해야 한다.

 WebRTC trickle 테스터로 테스트 시 유효한 Relay 후보를 반환해야 한다.

 OpenVidu 서버가 외부 Coturn 서버를 사용하도록 설정되어야 한다.

**🛠 Implementation Tasks**
[ ] Coturn Docker 컨테이너 배포 및 `turnserver.conf` 설정
[ ] OpenVidu 설정 파일(`AWS_URL`, `COTURN_IP`) 업데이트
[ ] 연결 테스트 수행
