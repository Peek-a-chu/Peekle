# 포팅 매뉴얼 (Porting Manual)

본 문서는 힐끔힐끔코딩 프로젝트의 빌드, 배포 및 실행 환경 구성을 위한 매뉴얼입니다.

## 1. 프로젝트 개요

- **프로젝트명**: 힐끔힐끔코딩
- **설명**: WebRTC 기반의 실시간 화상 통신과 알고리즘 문제 풀이를 결합한 멀티플레이어 게임 플랫폼
- **개발 기간**: 2025.01.06 ~ 2025.02.13

## 2. 개발 및 배포 환경

### 2.1. Backend
- **Language**: Java 21 (OpenJDK 21)
- **Framework**: Spring Boot 3.4.1
- **Build Tool**: Gradle 8.5
- **Database**:
  - MySQL 8.0 (Main DB)
  - Redis 7.0 (Cache & Session Store)
- **IDE**: IntelliJ IDEA 2024.1+

### 2.2. Frontend
- **Language**: TypeScript 5.0+
- **Framework**: Next.js 15.1.6 (App Router)
- **Runtime**: Node.js v20.10.0 (LTS)
- **Package Manager**: pnpm 8+ (권장) 또는 npm 10+
- **IDE**: VS Code (Recommended)

### 2.3. AI Server
- **Language**: Python 3.10+
- **Framework**: FastAPI
- **Library**: OpenAI, ChromaDB, Pandas
- **Vector DB**: ChromaDB (Docker 인스턴스)

### 2.4. Infrastructure
- **Server**: AWS EC2 (Ubuntu 22.04 LTS) 또는 동급의 Linux 환경
- **Container**: Docker 24+, Docker Compose v2.20+
- **Web Server**: Nginx 1.25+ (Reverse Proxy & SSL Termination)
- **Media Server**: LiveKit Server 1.5+

## 3. 프로젝트 구조 (Directory Structure)

```text
/
├── apps/
│   ├── backend/        # Spring Boot Application
│   ├── frontend/       # Next.js Application
│   ├── ai-server/      # FastAPI Application
│   └── extension/      # Chrome Extension Source
├── docker/             # Docker Configuration Files
│   ├── nginx/          # Nginx Configuration
│   ├── docker-compose.prod.yml  # Production Deployment
│   └── docker-compose.dev.yml   # Local Development
├── exec/               # Porting Manual & DB Dump (본 폴더)
└── ...
```

## 4. 빌드 및 배포 가이드 (Deployment Guide)

본 프로젝트는 Docker Compose를 사용하여 전체 서비스를 통합 배포하도록 구성되어 있습니다.

### 4.1. 사전 준비 사항
1.  **Repository Clone**: 소스 코드를 서버에 클론합니다.
2.  **Docker 설치**: 서버에 Docker 및 Docker Compose가 설치되어 있어야 합니다.
3.  **SSL 인증서**: `docker/nginx` 설정에 따라 SSL 인증서(LetsEncrypt)가 필요할 수 있습니다. (개발 환경에서는 HTTP 사용)

### 4.2. 환경 변수 설정 (.env)

**1) Backend (`apps/backend/.env`)**
```properties
DB_HOST= # 데이터베이스 호스트
DB_PORT= # 데이터베이스 포트
DB_NAME= # 데이터베이스 이름
DB_USERNAME= # 데이터베이스 계정명
DB_PASSWORD= # 데이터베이스 계정 비밀번호
DB_URL= # 전체 JDBC 접속 URL

REDIS_HOST= # Redis 호스트
REDIS_PORT= # Redis 포트
REDIS_PASSWORD= # Redis 비밀번호

LIVEKIT_URL= # LiveKit 서버 API URL
LIVEKIT_API_KEY= # LiveKit API 키
LIVEKIT_API_SECRET= # LiveKit API 비밀키

KAKAO_CLIENT_ID= # 카카오 로그인 REST API 키
KAKAO_CLIENT_SECRET= # 카카오 로그인 Client Secret
NAVER_CLIENT_ID= # 네이버 로그인 Client ID
NAVER_CLIENT_SECRET= # 네이버 로그인 Client Secret
GOOGLE_CLIENT_ID= # 구글 로그인 Client ID
GOOGLE_CLIENT_SECRET= # 구글 로그인 Client Secret

JWT_SECRET= # JWT 서명용 비밀키
FRONTEND_URL= # 프론트엔드 URL (CORS 등)

R2_ACCOUNT_ID= # Cloudflare R2 계정 ID
R2_ACCESS_KEY_ID= # R2 액세스 키 ID
R2_SECRET_ACCESS_KEY= # R2 시크릿 액세스 키
R2_BUCKET_NAME= # R2 버킷 이름
R2_PUBLIC_URL= # R2 공개 접속 URL
```

**2) Frontend (`apps/frontend/.env`)**
```properties
NEXT_PUBLIC_API_URL= # 백엔드 API URL
NEXT_PUBLIC_SOCKET_URL= # 웹소켓 연결 URL
NEXT_PUBLIC_GA_ID= # Google Analytics ID
```

**3) AI Server (`apps/ai-server/.env`)**
```properties
GMS_API_KEY= # OpenAI/Gemini API 키
GPT_BASE_URL= # GPT API Base URL (선택 사항)
CHROMA_HOST= # ChromaDB 호스트 (기본값: chroma)
CHROMA_PORT= # ChromaDB 포트 (기본값: 8000)
```

**4) Docker (`docker/.env`)**
```properties
# Redis
REDIS_PASSWORD= # Redis 비밀번호

# OpenVidu (혹은 이전 설정)
DOMAIN_OR_PUBLIC_IP= # 도메인 또는 공인 IP
OPENVIDU_SECRET= # OpenVidu 시크릿
CERTIFICATE_TYPE= # 인증서 타입 (selfsigned, letsencrypt 등)
HTTP_PORT= # HTTP 포트
HTTPS_PORT= # HTTPS 포트
OPENVIDU_RECORDING= # 녹화 기능 활성화 여부
OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH= # 비디오 수신 최대 대역폭
OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH= # 비디오 수신 최소 대역폭
OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH= # 비디오 송신 최대 대역폭
OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH= # 비디오 송신 최소 대역폭
OPENVIDU_LOG_LEVEL= # 로그 레벨

# Coturn (TURN Server)
COTURN_IP= # Coturn IP 주소
COTURN_PORT= # Coturn 포트
COTURN_SHARED_SECRET_KEY= # Coturn 공유 시크릿 키
TURN_USER= # TURN 사용자명
TURN_PASSWORD= # TURN 비밀번호

# LiveKit
PUBLIC_IP= # 서버 공인 IP
LIVEKIT_API_KEY= # LiveKit API 키
LIVEKIT_API_SECRET= # LiveKit API 비밀키
RTC_PORT_START= # RTC 통신 시작 포트
RTC_PORT_END= # RTC 통신 종료 포트
```

### 4.3. 서비스 실행 (Docker Compose)
`docker` 디렉토리로 이동하여 다음 명령어를 실행합니다.

```bash
# 디렉토리 이동
cd docker

# 컨테이너 빌드 및 실행 (백그라운드)
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4.4. 실행 확인
- **Frontend**: `http://localhost:3000` (또는 설정한 도메인)
- **Backend API**: `http://localhost:8080` (내부망), Nginx를 통해 80/443 포트로 접근
- **LiveKit Dashboard**: `http://localhost:7880`

## 5. 데이터베이스 (Database)

### 5.1. 접속 정보
- **Host**: ssafy-mysql-db.mysql.database.azure.com (SSAFY 제공 DB)
- **Port**: 3306
- **Database Name**: `S14P11A408`
- **Character Set**: UTF-8mb4

### 5.2. DB 덤프 파일
- **파일명**: `exec/dump.sql`
- **Import 방법**:
```bash
mysql -u [username] -p [database_name] < exec/dump.sql
```
