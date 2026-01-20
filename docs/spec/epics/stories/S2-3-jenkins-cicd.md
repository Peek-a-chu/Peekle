# S2-3. Jenkins CI/CD 설정 (DevOps)

## 📌 Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-3
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 2-3 days
- **Priority**: High
- **Dependencies**: S2-1 (Frontend Setup), S2-2 (Backend Setup)

---

## 🧾 User Story

**As a** DevOps 엔지니어
**I want to** Jenkins를 배포하고 GitLab 저장소에 연결하고 싶다
**So that** 코드 푸시가 자동으로 빌드 및 테스트를 트리거하게 하기 위함이다

---

## ✅ Acceptance Criteria

1. ✓ Jenkins 서버에 접근 가능해야 한다
2. ✓ GitLab 저장소로부터 Push 이벤트를 정상적으로 수신해야 한다
3. ✓ `Jenkinsfile` 파이프라인이 Frontend/Backend에 대해 Build 및 Test 단계를 실행해야 한다

---

## 🛠 Implementation Tasks

### Task 1: 외부 Jenkins 서버 연결 및 설정

**Jenkins 접속 정보 확인:**
외부에서 제공되는 Jenkins 서버의 URL과 접속 정보를 확인합니다.

1. 브라우저에서 Jenkins Server URL 접속
2. 제공받은 관리자 계정 또는 프로젝트별 계정으로 로그인

**Jenkins 초기 설정 (필요 시):**
관리자 권한이 있는 경우, 프로젝트에 필요한 플러그인이 설치되어 있는지 확인합니다.
(공용 서버인 경우, 이미 설치되어 있을 가능성이 높음)

### Task 2: Jenkins 필수 플러그인 설치

**필수 플러그인 목록:**
```
1. GitLab Plugin - GitLab 통합
2. GitLab Authentication - GitLab OAuth 인증
3. NodeJS Plugin - Node.js 빌드 환경
4. Gradle Plugin - Gradle 빌드
5. Docker Pipeline - Docker 이미지 빌드
6. Pipeline - 파이프라인 기능
7. Blue Ocean - 현대적인 UI
8. Mattermost Notification - Mattermost 알림
```

**플러그인 설치 방법:**
1. Jenkins 대시보드 → `Manage Jenkins` → `Plugins`
2. `Available plugins` 탭에서 위 플러그인 검색 및 설치
3. 또는 CLI를 통한 자동 설치:

```bash
docker exec peekle-jenkins jenkins-plugin-cli --plugins \
  gitlab-plugin \
  gitlab-oauth \
  nodejs \
  gradle \
  docker-workflow \
  workflow-aggregator \
  blueocean \
  mattermost
```

### Task 3: Jenkins GitLab 플러그인 및 Credential 설정

#### 3-1. GitLab Personal Access Token 생성
1. GitLab 로그인 → User Settings → Access Tokens
2. Token 생성:
   - Name: `Jenkins Integration`
   - Scopes: `api`, `read_repository`, `write_repository`
   - Expiration: 1년
3. 생성된 토큰 복사 (예: `glpat-xxxxxxxxxxxxxxxxxxxx`)

#### 3-2. Jenkins에 GitLab Credential 등록
1. Jenkins → `Manage Jenkins` → `Credentials` → `System` → `Global credentials`
2. `Add Credentials` 클릭
   - Kind: `GitLab API token`
   - Scope: `Global`
   - API token: `glpat-xxxxxxxxxxxxxxxxxxxx` (위에서 생성한 토큰)
   - ID: `gitlab-api-token`
   - Description: `GitLab API Token for Peekle`

#### 3-3. GitLab Connection 설정
1. Jenkins → `Manage Jenkins` → `System`
2. `GitLab` 섹션에서:
   - Connection name: `Peekle GitLab`
   - GitLab host URL: `https://lab.ssafy.com` (SSAFY GitLab URL)
   - Credentials: `gitlab-api-token` 선택
   - `Test Connection` 클릭하여 연결 확인

#### 3-4. GitLab에서 Jenkins Webhook 설정
1. GitLab 프로젝트 → Settings → Webhooks
2. Webhook 추가:
   - URL: `http://jenkins서버주소:8080/jenkins/project/peekle`
   - Secret Token: Jenkins에서 생성 (아래 참조)
   - Trigger: `Push events`, `Merge request events`
   - SSL verification: Enable (프로덕션) / Disable (개발)

### Task 4: Node.js 및 Gradle 환경 설정

#### 4-1. Node.js 설정
1. Jenkins → `Manage Jenkins` → `Tools`
2. `NodeJS installations` 섹션:
   - Name: `NodeJS-20`
   - Install automatically: ✓
   - Version: `NodeJS 20.11.0`

#### 4-2. Gradle 설정
1. Jenkins → `Manage Jenkins` → `Tools`
2. `Gradle installations` 섹션:
   - Name: `Gradle-8`
   - Install automatically: ✓
   - Version: `Gradle 8.5`

### Task 5: Jenkinsfile 작성 (Frontend)

**`apps/frontend/Jenkinsfile`:**
```groovy
pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        PROJECT_DIR = 'apps/frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Source code checked out from GitLab"
            }
        }

        stage('Install Dependencies') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "📦 Installing dependencies with pnpm..."
                        npm install -g pnpm@10.28.1
                        pnpm install --frozen-lockfile
                    '''
                }
            }
        }

        stage('Lint') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🔍 Running ESLint..."
                        pnpm run lint
                    '''
                }
            }
        }

        stage('Type Check') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🔍 Running TypeScript type check..."
                        pnpm run type-check
                    '''
                }
            }
        }

        stage('Format Check') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "✨ Checking code formatting..."
                        pnpm run format:check
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🏗️ Building Next.js application..."
                        pnpm run build
                    '''
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                dir("${PROJECT_DIR}") {
                    archiveArtifacts artifacts: '.next/**/*', fingerprint: true
                    echo "📦 Build artifacts archived"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Frontend pipeline completed successfully!"
        }
        failure {
            echo "❌ Frontend pipeline failed!"
        }
        always {
            cleanWs()
        }
    }
}
```

### Task 6: Jenkinsfile 작성 (Backend)

**`apps/backend/Jenkinsfile`:**
```groovy
pipeline {
    agent any

    tools {
        gradle 'Gradle-8'
        jdk 'JDK-21'
    }

    environment {
        PROJECT_DIR = 'apps/backend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Source code checked out from GitLab"
            }
        }

        stage('Permission') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh 'chmod +x gradlew'
                }
            }
        }

        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🏗️ Building Spring Boot application..."
                        ./gradlew clean build -x test
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🧪 Running tests..."
                        ./gradlew test
                    '''
                }
            }
            post {
                always {
                    dir("${PROJECT_DIR}") {
                        junit '**/build/test-results/test/*.xml'
                    }
                }
            }
        }

        stage('Code Quality') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh '''
                        echo "🔍 Running code quality checks..."
                        ./gradlew check
                    '''
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                dir("${PROJECT_DIR}") {
                    archiveArtifacts artifacts: 'build/libs/*.jar', fingerprint: true
                    echo "📦 Build artifacts archived"
                }
            }
        }
    }

    post {
        success {
            echo "✅ Backend pipeline completed successfully!"
        }
        failure {
            echo "❌ Backend pipeline failed!"
        }
        always {
            cleanWs()
        }
    }
}
```

### Task 7: JDK 21 설정

**JDK 설치 및 설정:**
1. Jenkins → `Manage Jenkins` → `Tools`
2. `JDK installations` 섹션:
   - Name: `JDK-21`
   - Install automatically: ✓
   - Install from: `adoptium.net`
   - Version: `jdk-21.0.1+12`

### Task 8: Multi-branch Pipeline 생성

#### 8-1. Frontend Pipeline 생성
1. Jenkins 대시보드 → `New Item`
2. 이름: `Peekle-Frontend`
3. Type: `Multibranch Pipeline`
4. Branch Sources:
   - Source: `GitLab Project`
   - Project: `https://lab.ssafy.com/your-group/peekle`
   - Credentials: `gitlab-api-token`
   - Behaviours:
     - Discover branches: `All branches`
     - Discover merge requests from origin: ✓
5. Build Configuration:
   - Mode: `by Jenkinsfile`
   - Script Path: `apps/frontend/Jenkinsfile`
6. Scan Multibranch Pipeline Triggers:
   - Periodically if not otherwise run: ✓
   - Interval: `1 minute`

#### 8-2. Backend Pipeline 생성
1. Jenkins 대시보드 → `New Item`
2. 이름: `Peekle-Backend`
3. Type: `Multibranch Pipeline`
4. Branch Sources 및 설정은 Frontend와 동일
5. Build Configuration:
   - Script Path: `apps/backend/Jenkinsfile`

### Task 9: GitLab Webhook 트리거 설정

#### 9-1. Jenkins에서 Webhook URL 확인
각 파이프라인의 Webhook URL:
- Frontend: `http://jenkins서버:8080/jenkins/project/Peekle-Frontend`
- Backend: `http://jenkins서버:8080/jenkins/project/Peekle-Backend`

#### 9-2. GitLab Webhook 등록
1. GitLab 프로젝트 → Settings → Webhooks
2. Frontend Webhook:
   - URL: Jenkins Frontend URL
   - Trigger: `Push events`, `Merge request events`
   - Branch filter: `*` (모든 브랜치)
   - Path filter: `apps/frontend/**`
3. Backend Webhook:
   - URL: Jenkins Backend URL
   - 설정은 Frontend와 동일
   - Path filter: `apps/backend/**`

### Task 10: 빌드 테스트

**테스트 시나리오:**

1. **Frontend 빌드 테스트:**
```bash
# Feature 브랜치 생성
git checkout -b feature/test-frontend-ci

# 간단한 변경
cd apps/frontend
echo "// Test change" >> src/app/page.tsx

# 커밋 및 푸시
git add .
git commit -m "test: Frontend CI pipeline"
git push origin feature/test-frontend-ci
```

2. **Backend 빌드 테스트:**
```bash
# Feature 브랜치 생성
git checkout -b feature/test-backend-ci

# 간단한 변경
cd apps/backend/src/main/java/com/peekle
echo "// Test change" >> PeekleApplication.java

# 커밋 및 푸시
git add .
git commit -m "test: Backend CI pipeline"
git push origin feature/test-backend-ci
```

3. **Jenkins에서 빌드 확인:**
   - Jenkins 대시보드에서 자동으로 빌드가 트리거되는지 확인
   - Blue Ocean UI에서 파이프라인 진행 상황 모니터링
   - 각 Stage가 성공적으로 완료되는지 확인

---

## 🧪 Testing & Validation

### 1. Jenkins 접속 테스트
```bash
# Jenkins 상태 확인
curl http://localhost:8080/jenkins/login

# 예상: Jenkins 로그인 페이지 HTML 반환
```

### 2. GitLab Connection 테스트
1. Jenkins → `Manage Jenkins` → `System` → `GitLab`
2. `Test Connection` 버튼 클릭
3. 예상 결과: `Success`

### 3. Pipeline 실행 테스트
```bash
# Frontend 수동 빌드
curl -X POST http://localhost:8080/jenkins/job/Peekle-Frontend/job/main/build \
  --user admin:peekle-jenkins-admin

# Backend 수동 빌드
curl -X POST http://localhost:8080/jenkins/job/Peekle-Backend/job/main/build \
  --user admin:peekle-jenkins-admin
```

### 4. Webhook 트리거 테스트
```bash
# GitLab에서 테스트 푸시
cd apps/frontend
echo "// Webhook test" >> src/app/layout.tsx
git add .
git commit -m "test: Webhook trigger"
git push origin main

# Jenkins에서 자동 빌드 트리거 확인
```

### 5. 빌드 결과 확인
- ✅ 모든 Stage가 녹색(성공)으로 표시
- ✅ Build artifacts가 정상적으로 저장됨
- ✅ 빌드 시간이 합리적인 범위 내 (Frontend: 3-5분, Backend: 2-4분)

---

## 📦 Deliverables

- [ ] Jenkins Docker 컨테이너 실행
- [ ] 필수 플러그인 설치 (GitLab, NodeJS, Gradle 등)
- [ ] GitLab API Token 및 Credential 설정
- [ ] Node.js 20, Gradle 8, JDK 17 환경 설정
- [ ] Frontend Jenkinsfile (5 stages)
- [ ] Backend Jenkinsfile (6 stages)
- [ ] Multibranch Pipeline 생성 (Frontend, Backend)
- [ ] GitLab Webhook 연동 완료
- [ ] 빌드 테스트 성공

---

## 📋 Troubleshooting

### 문제 1: GitLab Connection 실패
**증상:** `Test Connection` 실패
**해결:**
```bash
# Jenkins 컨테이너 내부에서 GitLab 접속 가능한지 확인
docker exec peekle-jenkins curl -I https://lab.ssafy.com

# DNS 문제일 경우 docker compose.yml에 추가
extra_hosts:
  - "lab.ssafy.com:YOUR_GITLAB_IP"
```

### 문제 2: pnpm 명령어를 찾을 수 없음
**증상:** `pnpm: command not found`
**해결:**
```groovy
// Jenkinsfile에서 pnpm 설치 추가
sh 'npm install -g pnpm@10.28.1'
sh 'pnpm --version'  // 설치 확인
```

### 문제 3: Gradle 권한 오류
**증상:** `Permission denied: ./gradlew`
**해결:**
```groovy
// Jenkinsfile에 Permission stage 추가됨 (Task 6 참조)
sh 'chmod +x gradlew'
```

### 문제 4: Docker socket 권한 오류
**증상:** `Cannot connect to Docker daemon`
**해결:**
```bash
# Jenkins 컨테이너에 Docker 그룹 권한 부여
docker exec -u root peekle-jenkins chmod 666 /var/run/docker.sock
```

---

## 📚 Related Documents
- [Architecture Design](../../architecture.md)
- [Sprint Plan](../../sprint-plan.md)
- [Epic-02: Infrastructure](../epic-01-infra.md)
- [S2-1: Frontend Setup](./S2-1-frontend-setup.md)
- [S2-2: Backend Setup](./S2-2-backend-setup.md)

---

## 🔗 References
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Jenkins GitLab Plugin](https://github.com/jenkinsci/gitlab-plugin)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [GitLab Webhooks](https://docs.gitlab.com/ee/user/project/integrations/webhooks.html)
- [Blue Ocean Documentation](https://www.jenkins.io/doc/book/blueocean/)
