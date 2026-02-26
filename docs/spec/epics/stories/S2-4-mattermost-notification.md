# S2-4. MatterMost 알림 봇 (DevOps)

## 📌 Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-4
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 0.5-1 day
- **Priority**: Medium
- **Dependencies**: S2-3 (Jenkins CI/CD Setup)

---

## 🧾 User Story

**As a** 팀원
**I want to** MatterMost에서 빌드 알림을 받고 싶다
**So that** 빌드가 실패했는지 즉시 알기 위함이다

---

## ✅ Acceptance Criteria

1. ✓ MatterMost Incoming Webhook URL이 생성되어야 한다
2. ✓ Jenkins 빌드 성공/실패 시 상태와 링크가 포함된 메시지가 채널에 게시되어야 한다

---

## 🛠 Implementation Tasks

### Task 1: MatterMost 채널 생성 및 Webhook 설정

#### 1-1. MatterMost 채널 생성
1. MatterMost 접속 (SSAFY 제공 MatterMost 서버)
2. 좌측 사이드바에서 팀 선택 또는 생성
3. `Create New Channel` 클릭
   - Channel name: `peekle-ci-notifications`
   - Channel type: `Public` (팀원 모두 접근 가능)
   - Purpose: `Jenkins CI/CD 빌드 알림 채널`

#### 1-2. Incoming Webhook 생성
1. 채널 우측 상단 `⚙️ Settings` → `Integrations` → `Incoming Webhooks`
2. `Add Incoming Webhook` 클릭
3. Webhook 설정:
   - **Title**: `Jenkins Build Notifier`
   - **Description**: `Peekle 프로젝트 Jenkins 빌드 결과 알림`
   - **Channel**: `peekle-ci-notifications`
4. `Save` 클릭 후 Webhook URL 복사
   ```
   예시: https://meeting.ssafy.com/hooks/abcd1234efgh5678ijkl
   ```

#### 1-3. Webhook URL 환경변수 설정
**Jenkins에 Webhook URL 등록:**
1. Jenkins → `Manage Jenkins` → `Credentials` → `System` → `Global credentials`
2. `Add Credentials` 클릭
   - Kind: `Secret text`
   - Scope: `Global`
   - Secret: `https://meeting.ssafy.com/hooks/abcd1234efgh5678ijkl`
   - ID: `mattermost-webhook-url`
   - Description: `MatterMost Webhook URL for CI Notifications`

### Task 2: Jenkinsfile에 알림 스크립트 추가

#### 2-1. 알림 함수 정의

**공통 알림 함수 (`vars/notifyMattermost.groovy`):**
```groovy
// Jenkins Shared Library (선택사항)
// 파일 위치: vars/notifyMattermost.groovy

def call(String status, String jobName, String buildNumber, String buildUrl) {
    def webhookUrl = env.MATTERMOST_WEBHOOK_URL

    def color = status == 'SUCCESS' ? '#36a64f' : '#ff0000'
    def emoji = status == 'SUCCESS' ? ':white_check_mark:' : ':x:'
    def statusText = status == 'SUCCESS' ? '성공' : '실패'

    def payload = """
    {
        "username": "Jenkins Bot",
        "icon_url": "https://wiki.jenkins.io/download/attachments/2916393/logo.png",
        "attachments": [
            {
                "fallback": "${jobName} 빌드 #${buildNumber} ${statusText}",
                "color": "${color}",
                "title": "${emoji} ${jobName} 빌드 #${buildNumber}",
                "title_link": "${buildUrl}",
                "text": "빌드 결과: **${statusText}**",
                "fields": [
                    {
                        "short": true,
                        "title": "프로젝트",
                        "value": "${jobName}"
                    },
                    {
                        "short": true,
                        "title": "빌드 번호",
                        "value": "#${buildNumber}"
                    },
                    {
                        "short": false,
                        "title": "빌드 로그",
                        "value": "[로그 확인하기](${buildUrl}console)"
                    }
                ],
                "footer": "Peekle CI/CD",
                "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
            }
        ]
    }
    """

    sh """
        curl -X POST -H 'Content-Type: application/json' \
        -d '${payload}' \
        ${webhookUrl}
    """
}
```

#### 2-2. Frontend Jenkinsfile 업데이트

**`apps/frontend/Jenkinsfile` 수정:**
```groovy
pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    environment {
        PROJECT_DIR = 'apps/frontend'
        MATTERMOST_WEBHOOK_URL = credentials('mattermost-webhook-url')
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
            script {
                def jobName = env.JOB_NAME
                def buildNumber = env.BUILD_NUMBER
                def buildUrl = env.BUILD_URL

                sh """
                    curl -X POST -H 'Content-Type: application/json' \
                    -d '{
                        "username": "Jenkins Bot",
                        "icon_url": "https://wiki.jenkins.io/download/attachments/2916393/logo.png",
                        "attachments": [{
                            "fallback": "${jobName} 빌드 #${buildNumber} 성공",
                            "color": "#36a64f",
                            "title": ":white_check_mark: ${jobName} 빌드 #${buildNumber}",
                            "title_link": "${buildUrl}",
                            "text": "빌드 결과: **성공**",
                            "fields": [
                                {"short": true, "title": "프로젝트", "value": "Frontend"},
                                {"short": true, "title": "빌드 번호", "value": "#${buildNumber}"},
                                {"short": false, "title": "빌드 로그", "value": "[로그 확인하기](${buildUrl}console)"}
                            ],
                            "footer": "Peekle CI/CD"
                        }]
                    }' \
                    ${MATTERMOST_WEBHOOK_URL}
                """
            }
            echo "✅ Frontend pipeline completed successfully!"
        }

        failure {
            script {
                def jobName = env.JOB_NAME
                def buildNumber = env.BUILD_NUMBER
                def buildUrl = env.BUILD_URL

                sh """
                    curl -X POST -H 'Content-Type: application/json' \
                    -d '{
                        "username": "Jenkins Bot",
                        "icon_url": "https://wiki.jenkins.io/download/attachments/2916393/logo.png",
                        "attachments": [{
                            "fallback": "${jobName} 빌드 #${buildNumber} 실패",
                            "color": "#ff0000",
                            "title": ":x: ${jobName} 빌드 #${buildNumber}",
                            "title_link": "${buildUrl}",
                            "text": "빌드 결과: **실패**",
                            "fields": [
                                {"short": true, "title": "프로젝트", "value": "Frontend"},
                                {"short": true, "title": "빌드 번호", "value": "#${buildNumber}"},
                                {"short": false, "title": "빌드 로그", "value": "[로그 확인하기](${buildUrl}console)"}
                            ],
                            "footer": "Peekle CI/CD"
                        }]
                    }' \
                    ${MATTERMOST_WEBHOOK_URL}
                """
            }
            echo "❌ Frontend pipeline failed!"
        }

        always {
            cleanWs()
        }
    }
}
```

#### 2-3. Backend Jenkinsfile 업데이트

**`apps/backend/Jenkinsfile` 수정:**
```groovy
pipeline {
    agent any

    tools {
        gradle 'Gradle-8'
        jdk 'JDK-21'
    }

    environment {
        PROJECT_DIR = 'apps/backend'
        MATTERMOST_WEBHOOK_URL = credentials('mattermost-webhook-url')
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
            script {
                def jobName = env.JOB_NAME
                def buildNumber = env.BUILD_NUMBER
                def buildUrl = env.BUILD_URL

                sh """
                    curl -X POST -H 'Content-Type: application/json' \
                    -d '{
                        "username": "Jenkins Bot",
                        "icon_url": "https://wiki.jenkins.io/download/attachments/2916393/logo.png",
                        "attachments": [{
                            "fallback": "${jobName} 빌드 #${buildNumber} 성공",
                            "color": "#36a64f",
                            "title": ":white_check_mark: ${jobName} 빌드 #${buildNumber}",
                            "title_link": "${buildUrl}",
                            "text": "빌드 결과: **성공**",
                            "fields": [
                                {"short": true, "title": "프로젝트", "value": "Backend"},
                                {"short": true, "title": "빌드 번호", "value": "#${buildNumber}"},
                                {"short": false, "title": "빌드 로그", "value": "[로그 확인하기](${buildUrl}console)"}
                            ],
                            "footer": "Peekle CI/CD"
                        }]
                    }' \
                    ${MATTERMOST_WEBHOOK_URL}
                """
            }
            echo "✅ Backend pipeline completed successfully!"
        }

        failure {
            script {
                def jobName = env.JOB_NAME
                def buildNumber = env.BUILD_NUMBER
                def buildUrl = env.BUILD_URL

                sh """
                    curl -X POST -H 'Content-Type: application/json' \
                    -d '{
                        "username": "Jenkins Bot",
                        "icon_url": "https://wiki.jenkins.io/download/attachments/2916393/logo.png",
                        "attachments": [{
                            "fallback": "${jobName} 빌드 #${buildNumber} 실패",
                            "color": "#ff0000",
                            "title": ":x: ${jobName} 빌드 #${buildNumber}",
                            "title_link": "${buildUrl}",
                            "text": "빌드 결과: **실패**",
                            "fields": [
                                {"short": true, "title": "프로젝트", "value": "Backend"},
                                {"short": true, "title": "빌드 번호", "value": "#${buildNumber}"},
                                {"short": false, "title": "빌드 로그", "value": "[로그 확인하기](${buildUrl}console)"}
                            ],
                            "footer": "Peekle CI/CD"
                        }]
                    }' \
                    ${MATTERMOST_WEBHOOK_URL}
                """
            }
            echo "❌ Backend pipeline failed!"
        }

        always {
            cleanWs()
        }
    }
}
```

### Task 3: MatterMost Plugin 방식 (대안)

**Jenkins MatterMost Plugin 사용 (더 간편한 방법):**

#### 3-1. MatterMost Notification Plugin 설정
1. Jenkins → `Manage Jenkins` → `System`
2. `Mattermost Notifications` 섹션:
   - **Endpoint**: `https://meeting.ssafy.com/hooks/abcd1234efgh5678ijkl`
   - **Channel**: `peekle-ci-notifications`
   - **Test Connection** 클릭하여 확인

#### 3-2. Simplified Jenkinsfile (Plugin 사용)
```groovy
post {
    success {
        mattermostSend(
            color: 'good',
            message: ":white_check_mark: **${env.JOB_NAME}** 빌드 #${env.BUILD_NUMBER} 성공\n[로그 확인](${env.BUILD_URL}console)",
            channel: 'peekle-ci-notifications'
        )
    }
    failure {
        mattermostSend(
            color: 'danger',
            message: ":x: **${env.JOB_NAME}** 빌드 #${env.BUILD_NUMBER} 실패\n[로그 확인](${env.BUILD_URL}console)",
            channel: 'peekle-ci-notifications'
        )
    }
}
```

---

## 🧪 Testing & Validation

### 1. Webhook URL 테스트
```bash
# MatterMost Webhook 직접 호출 테스트
curl -X POST https://meeting.ssafy.com/hooks/abcd1234efgh5678ijkl \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "Test Bot",
    "text": "Webhook 연결 테스트입니다."
  }'
```

**예상 결과:** MatterMost 채널에 "Webhook 연결 테스트입니다." 메시지 표시

### 2. Jenkins 빌드 성공 알림 테스트
```bash
# 성공 시나리오: 정상 코드 푸시
cd apps/frontend
echo "// Success test" >> src/app/page.tsx
git add .
git commit -m "test: Success notification"
git push origin main
```

**예상 MatterMost 메시지:**
```
✅ Peekle-Frontend/main 빌드 #42
빌드 결과: 성공
프로젝트: Frontend
빌드 번호: #42
빌드 로그: [로그 확인하기]
```

### 3. Jenkins 빌드 실패 알림 테스트
```bash
# 실패 시나리오: 의도적으로 TypeScript 에러 발생
cd apps/frontend/src
echo "const x: number = 'string'" >> app/page.tsx
git add .
git commit -m "test: Failure notification"
git push origin main
```

**예상 MatterMost 메시지:**
```
❌ Peekle-Frontend/main 빌드 #43
빌드 결과: 실패
프로젝트: Frontend
빌드 번호: #43
빌드 로그: [로그 확인하기]
```

### 4. 알림 포맷 검증
- ✅ 채널에 메시지가 정상적으로 표시됨
- ✅ 성공/실패 색상이 올바르게 표시됨 (녹색/빨간색)
- ✅ Jenkins 빌드 링크가 클릭 가능하고 정상 작동함
- ✅ 이모지가 정상적으로 렌더링됨

---

## 📦 Deliverables

- [x] MatterMost 채널 생성 (`peekle-ci-notifications`)
- [x] Incoming Webhook URL 생성 및 Jenkins Credential 등록
- [x] Frontend Jenkinsfile `post` 블록에 알림 스크립트 추가
- [x] Backend Jenkinsfile `post` 블록에 알림 스크립트 추가
- [x] 성공/실패 알림 테스트 완료

---

## 📋 알림 메시지 커스터마이징

### 추가 정보 포함 예시

**Git 커밋 정보 포함:**
```groovy
post {
    success {
        script {
            def commitMsg = sh(
                script: "git log -1 --pretty=%B",
                returnStdout: true
            ).trim()
            def commitAuthor = sh(
                script: "git log -1 --pretty=%an",
                returnStdout: true
            ).trim()

            sh """
                curl -X POST -H 'Content-Type: application/json' \
                -d '{
                    "attachments": [{
                        "color": "#36a64f",
                        "title": ":white_check_mark: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                        "fields": [
                            {"short": true, "title": "작성자", "value": "${commitAuthor}"},
                            {"short": true, "title": "커밋", "value": "${commitMsg}"}
                        ]
                    }]
                }' \
                ${MATTERMOST_WEBHOOK_URL}
            """
        }
    }
}
```

**빌드 시간 포함:**
```groovy
fields: [
    {"short": true, "title": "빌드 시간", "value": "${currentBuild.durationString}"},
    {"short": true, "title": "상태", "value": "성공"}
]
```

---

## 📚 Related Documents
- [Architecture Design](../../architecture.md)
- [Sprint Plan](../../sprint-plan.md)
- [Epic-02: Infrastructure](../epic-01-infra.md)
- [S2-3: Jenkins CI/CD Setup](./S2-3-jenkins-cicd.md)

---

## 🔗 References
- [MatterMost Incoming Webhooks](https://docs.mattermost.com/developer/webhooks-incoming.html)
- [MatterMost Message Attachments](https://docs.mattermost.com/developer/message-attachments.html)
- [Jenkins MatterMost Plugin](https://plugins.jenkins.io/mattermost/)
- [Jenkins Post Build Actions](https://www.jenkins.io/doc/pipeline/tour/post/)
