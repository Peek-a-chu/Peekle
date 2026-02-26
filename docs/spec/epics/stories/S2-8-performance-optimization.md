# S2-6. 성능 및 빌드 최적화 (Optimization)

## Story Information

- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-6
- **Sprint**: Week 2 (Maintenance & Optimization)
- **Estimated Effort**: 1-2 days
- **Priority**: Medium
- **Dependencies**: S2-3 (GitLab CI/CD)

---

## User Story

**As a** 서비스 운영자 및 개발자
**I want to** 애플리케이션의 빌드 속도와 런타임 성능을 전 계층(Frontend/Backend/Infra)에서 최적화하고 싶다
**So that** 사용자에게 빠른 응답 속도를 제공하고, 배포 효율성을 극대화하여 비용을 절감하기 위함이다

---

## Acceptance Criteria

1. Frontend 빌드 시간이 기존 대비 50% 이상 단축되어야 한다 (Turbo Prune 적용).
2. Backend API 응답 지연이 최소화되어야 하며, 동시 접속 처리가 효율적이어야 한다 (Virtual Threads, ZGC).
3. Docker 이미지 빌드 시 불필요한 컨텍스트 전송이 없어야 한다.
4. CI/CD 파이프라인에서 변경된 모듈만 지능적으로 빌드해야 한다.
5. 리버스 프록시 레벨에서 SSL 캐싱 및 압축이 적용되어야 한다.

---

## Implementation Tasks

### Task 1: Frontend 빌드 및 번들 최적화

Next.js Monorepo 환경에서의 빌드 병목을 해소하고, 최종 번들 사이즈를 줄입니다.

#### Step 1: Turbo Prune 적용 (`Dockerfile`)

Monorepo의 전체 의존성을 복사하는 대신, `turbo prune`을 사용하여 Frontend에 필요한 패키지만 격리(Isolation)합니다.

```dockerfile
# apps/frontend/Dockerfile
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune frontend --docker
```

#### Step 2: Next.js 번들링 최적화 (`next.config.ts`)

무거운 라이브러리를 트리쉐이킹하고, 불필요한 Node.js 모듈을 제외합니다.

- `optimizePackageImports`: `fabric`, `@monaco-editor/react`, `lucide-react` 추가
- `webpack.externals`: `canvas`, `jsdom`, `utf-8-validate` 등 브라우저 미사용 모듈 제거
- `reactCompiler`: React 19 컴파일러 활성화

### Task 2: Backend 런타임 성능 튜닝

Spring Boot 3.4 및 Java 21의 최신 기능을 활용하여 고성능 환경을 구축합니다.

#### Step 1: Virtual Threads 및 ZGC 활성화

`application.yml` 및 `Dockerfile`을 수정하여 처리량과 응답 시간을 개선합니다.

- **Virtual Threads**: `spring.threads.virtual.enabled: true` (I/O 블로킹 최소화)
- **ZGC**: `-XX:+UseZGC -XX:+ZGenerational` (GC Pause Time < 1ms)

#### Step 2: Gradle 빌드 캐싱

CI 환경에서의 빌드 속도를 위해 Gradle Caching을 활성화합니다.

```properties
# apps/backend/gradle.properties
org.gradle.caching=true
org.gradle.parallel=true
org.gradle.jvmargs=-Xmx2g -XX:+UseZGC
```

### Task 3: Infrastructure 및 CI/CD 파이프라인 고도화

#### Step 1: Docker Context 최적화

Project Root에 `.dockerignore`를 생성하여 빌드 컨텍스트 전송 시간을 단축합니다.

- 제외 항목: `.git`, `node_modules`, `.next`, `build` 등

#### Step 2: Nginx 웹 서버 튜닝

SSL 핸드셰이크 시간을 줄이고 전송 효율을 높입니다.

- `ssl_session_cache`: TLS 세션 캐싱 (Shared 50MB)
- `ssl_stapling`: OCSP Stapling 활성화
- `gzip`: 텍스트 리소스 압축 전송

#### Step 3: GitLab CI Smart Build

변경된 모듈만 감지하여 빌드하는 로직을 `.gitlab-ci.yml`에 추가합니다.

```yaml
# .gitlab-ci.yml (Deployment Script Snippet)
CHANGED_FILES=$(git diff --name-only ...)
if [ "$FRONTEND_CHANGED" = "yes" ]; then
docker compose build frontend
fi
```
