# S2-3. GitLab CI/CD 및 EC2 자동 배포 설정 (DevOps)

## Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-3
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 2-3 days
- **Priority**: High
- **Dependencies**: S2-1 (Frontend Setup), S2-2 (Backend Setup)

---

## User Story

**As a** DevOps 엔지니어
**I want to** GitLab CI/CD를 통해 EC2에 자동 배포하고 싶다
**So that** 코드 푸시가 자동으로 빌드, 테스트 및 배포를 트리거하게 하기 위함이다

---

## Acceptance Criteria

1. GitLab CI/CD 파이프라인이 정상 작동해야 한다
2. master 브랜치 푸시 시 자동으로 린트 및 빌드가 실행되어야 한다
3. SSH를 통해 EC2 인스턴스에 Docker 컨테이너로 배포되어야 한다
4. Nginx 리버스 프록시를 통해 Frontend/Backend가 서비스되어야 한다

---

## Implementation Tasks

### Task 1: GitLab CI/CD Variables 설정

GitLab 프로젝트의 **Settings > CI/CD > Variables**에서 다음 변수들을 설정합니다:

| Variable | Type | Description |
|----------|------|-------------|
| `SSH_PRIVATE_KEY_BASE64` | Variable | EC2 접속용 SSH Private Key (Base64 인코딩) |
| `EC2_HOST` | Variable | EC2 인스턴스 IP 또는 도메인 |
| `EC2_USER` | Variable | EC2 SSH 사용자 (예: ubuntu, ec2-user) |
| `DOMAIN_NAME` | Variable | 서비스 도메인 (i14a408.p.ssafy.io) |

#### Step 1: SSH Private Key를 Base64로 인코딩

로컬 머신에서 다음 명령어를 실행하여 SSH 키를 Base64로 인코딩합니다:

```bash
# SSH Private Key를 Base64로 인코딩 (줄바꿈 없이)
cat ~/.ssh/id_rsa | base64 -w0

# 또는 특정 키 파일 사용
cat /path/to/your-key.pem | base64 -w0
```

> **참고:** `-w0` 옵션은 출력에 줄바꿈 문자가 포함되지 않도록 합니다.

#### Step 2: GitLab에 Base64 인코딩된 SSH 키 저장

1. GitLab 프로젝트 > **Settings** > **CI/CD** > **Variables**
2. **Add variable** 클릭
3. 설정:
   - **Key**: `SSH_PRIVATE_KEY_BASE64`
   - **Value**: Step 1에서 생성한 Base64 문자열 붙여넣기
   - **Type**: Variable
   - **Protected**: 선택 (protected 브랜치에서만 사용)
   - **Masked**: 선택 (로그에서 숨김)
4. **Add variable** 클릭하여 저장

#### Step 3: CI/CD 스크립트에서 디코딩

`.gitlab-ci.yml`에서 다음과 같이 디코딩하여 사용합니다:

```yaml
before_script:
  - mkdir -p ~/.ssh
  - echo "$SSH_PRIVATE_KEY_BASE64" | base64 -d > ~/.ssh/id_rsa
  - chmod 600 ~/.ssh/id_rsa
```

### Task 2: EC2 인스턴스 초기 설정

EC2 인스턴스에 SSH 접속 후 다음을 실행합니다:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git 설치
sudo apt install -y git

# VIM 설치 (환경 변수 편집용)
sudo apt install -y vim

# 프로젝트 클론
cd /home/$USER
git clone https://lab.ssafy.com/your-group/peekle.git
cd peekle

# 환경 변수 파일 생성
cp docker/.env.example docker/.env
vim docker/.env  # 필요에 따라 수정
```

### Task 3: SSL 인증서 발급 및 자동 생성 (Containerized)

현재 인프라는 Nginx 컨테이너 기동 시 인증서 존재 여부를 확인하고, 없을 경우 사설 인증서를 자동으로 생성하여 즉시 서비스가 가능하도록 구성되어 있습니다.

```bash
# 1. Nginx Dockerfile 및 entrypoint.sh를 통한 자동 생성
# 별도의 외부 명령 없이 docker compose up 시 i14a408.p.ssafy.io 인증서 생성됨

# 2. 공인 인증서 (Let's Encrypt) 전환 시
# docker/certbot/conf/live/i14a408.p.ssafy.io/ 경로에 
# fullchain.pem과 privkey.pem을 배치하면 컨테이너가 이를 우선적으로 사용함
```

### Task 4: 파이프라인 파일 구조

```
peekle/
├── .gitlab-ci.yml              # GitLab CI/CD 파이프라인
├── apps/
│   ├── frontend/
│   │   └── Dockerfile          # Frontend Docker 이미지
│   └── nest-api/
│       └── Dockerfile          # Backend Docker 이미지
└── docker/
    ├── docker-compose.prod.yml # 프로덕션 Docker Compose
    ├── .env.example            # 환경 변수 예제
    ├── nginx/
    │   ├── nginx.conf          # Nginx 메인 설정
    │   └── conf.d/
    │       └── default.conf    # 사이트 설정
    └── coturn/
        └── turnserver.conf     # TURN 서버 설정
```

### Task 5: 배포 테스트

**수동 배포 트리거:**
1. GitLab > CI/CD > Pipelines
2. 최신 파이프라인의 `deploy-production` 작업 확인
3. "Play" 버튼 클릭하여 수동 배포 실행

**자동 배포 전환:**
`.gitlab-ci.yml`에서 `when: manual` 제거 시 자동 배포 활성화

---

## Testing & Validation

### 1. 파이프라인 동작 확인
```bash
# GitLab에서 확인
# CI/CD > Pipelines에서 각 stage 상태 확인
# - lint: 성공
# - build: 성공
# - deploy: 성공
```

### 2. 서비스 상태 확인
```bash
# EC2에서 실행
docker compose -f docker-compose.prod.yml ps

# 예상 출력:
# NAME               STATUS
# peekle-nginx       Up
# peekle-frontend    Up
# peekle-backend     Up
# peekle-redis       Up (healthy)
# peekle-openvidu    Up
# peekle-coturn      Up
```

### 3. 엔드포인트 테스트
```bash
# Frontend 확인
curl -I https://i14a408.p.ssafy.io

# Backend API 확인
curl https://i14a408.p.ssafy.io/api/health

# WebSocket 확인
# 브라우저 개발자 도구에서 WebSocket 연결 확인
```

---

## Deliverables

- [x] Frontend Dockerfile (Multi-stage build)
- [x] Backend Dockerfile (Spring Boot)
- [x] docker-compose.prod.yml
- [x] Nginx 설정 파일 (SSL, 리버스 프록시)
- [x] .gitlab-ci.yml (lint -> build -> deploy)
- [x] GitLab CI/CD Variables 설정
- [ ] EC2 초기 설정 완료
- [x] 컨테이너 기반 SSL 인증서 적용 (i14a408.p.ssafy.io)
- [ ] 배포 테스트 성공

---

## Troubleshooting

### 문제 1: SSH 연결 실패
**증상:** `Permission denied (publickey)`
**해결:**
```bash
# 1. Base64 인코딩이 올바른지 확인
echo "$SSH_PRIVATE_KEY_BASE64" | base64 -d | head -1
# 예상 출력: -----BEGIN RSA PRIVATE KEY----- 또는 -----BEGIN OPENSSH PRIVATE KEY-----

# 2. EC2의 ~/.ssh/authorized_keys에 공개키가 있는지 확인
ssh -i your-key.pem $EC2_USER@$EC2_HOST

# 3. GitLab CI/CD Variables에서 SSH_PRIVATE_KEY_BASE64 확인
# - Masked 설정이 되어 있어도 값이 올바르게 저장되었는지 확인
# - 줄바꿈 없이 인코딩되었는지 확인 (base64 -w0)
```

### 문제 2: Docker 권한 오류
**증상:** `permission denied while trying to connect to the Docker daemon`
**해결:**
```bash
# EC2에서 실행
sudo usermod -aG docker $USER
# 재로그인 필요
```

### 문제 3: SSL 인증서 발급 실패
**증상:** `Challenge failed for domain`
**해결:**
```bash
# DNS 설정 확인
nslookup your-domain.com

# 포트 80이 열려있는지 확인
sudo netstat -tlnp | grep :80

# AWS Security Group에서 80, 443 포트 허용 확인
```

### 문제 4: Nginx 502 Bad Gateway
**증상:** 서비스 접속 시 502 에러
**해결:**
```bash
# 컨테이너 상태 확인
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs backend

# 네트워크 확인
docker network ls
docker network inspect docker_peekle-network
```

---

## Architecture Diagram

```
                         Internet
                             │
                             ▼
               ┌─────────────────────────────────┐
               │         AWS EC2                 │
               │   ┌─────────────────────────┐   │
               │   │        Nginx            │   │  ← Let's Encrypt SSL
               │   │    (Port 80, 443)       │   │
               │   └───────────┬─────────────┘   │
               │               │                 │
               │    ┌──────────┴──────────┐      │
               │    │                     │      │
               │    ▼                     ▼      │
               │ ┌───────┐          ┌───────┐    │
               │ │ Front │          │ Back  │    │
               │ │ end   │          │ end   │    │
               │ │ :3000 │          │ :8080 │    │
               │ └───────┘          └───┬───┘    │
               │                        │        │
               │ ┌──────────────────────┼──────┐ │
               │ │                      │      │ │
               │ ▼                      ▼      │ │
               │ ┌────────┐       ┌─────────┐  │ │
               │ │OpenVidu│◄─────►│  Redis  │  │ │
               │ │ :4443  │       │  :6379  │  │ │
               │ └────┬───┘       └─────────┘  │ │
               │      │                        │ │
               │      ▼                        │ │
               │ ┌────────┐                    │ │
               │ │ Coturn │ (TURN/STUN)        │ │
               │ │ :3478  │                    │ │
               │ └────────┘                    │ │
               └─────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
       ┌───────┐        ┌────────┐        ┌─────┐
       │ MySQL │        │ GitLab │        │ S3  │
       │(외부) │        │(CI/CD) │        │     │
       └───────┘        └────────┘        └─────┘
```

### 컨테이너 포트 매핑

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| Nginx | 80, 443 | 80, 443 | TCP |
| Frontend | 3000 | - (internal) | TCP |
| Backend | 8080 | - (internal) | TCP |
| Redis | 6379 | - (internal) | TCP |
| OpenVidu | 4443 | 4443 | TCP |
| OpenVidu (media) | 40000-40050 | 40000-40050 | UDP/TCP |
| Coturn | 3478 | 3478 | UDP/TCP |
| Coturn (TLS) | 5349 | 5349 | UDP/TCP |
| Coturn (relay) | 51000-51050 | 51000-51050 | UDP |

---

## Related Documents
- [Architecture Design](../../architecture.md)
- [Sprint Plan](../../sprint-plan.md)
- [Epic-02: Infrastructure](../epic-01-infra.md)
- [S2-1: Frontend Setup](./S2-1-frontend-setup.md)
- [S2-2: Backend Setup](./S2-2-backend-setup.md)

---

## References
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt with Docker](https://certbot.eff.org/instructions?ws=nginx&os=pip)
