# 외부 서비스 정보 (External Services)

본 프로젝트(Peekle)에서 사용하는 외부 서비스와 해당 서비스의 설정 및 관련 정보를 정리한 문서입니다.

## 1. 소셜 로그인 (OAuth2)

사용자 인증을 위해 다음의 소셜 로그인 서비스를 사용합니다. 각 서비스의 개발자 콘솔에서 애플리케이션을 등록하고 발급받은 키를 환경 변수에 설정해야 합니다.

### 1.1. Kakao Login
- **용도**: 사용자 간편 로그인
- **관리 콘솔**: [Kakao Developers](https://developers.kakao.com/)
- **필요 정보**:
  - `KAKAO_CLIENT_ID`: REST API 키
  - `KAKAO_CLIENT_SECRET`: Client Secret (보안 설정 시)
- **설정 위치**: `apps/backend/.env`

### 1.2. Naver Login
- **용도**: 사용자 간편 로그인
- **관리 콘솔**: [Naver Developers](https://developers.naver.com/)
- **필요 정보**:
  - `NAVER_CLIENT_ID`: Client ID
  - `NAVER_CLIENT_SECRET`: Client Secret
- **설정 위치**: `apps/backend/.env`

### 1.3. Google Login
- **용도**: 사용자 간편 로그인
- **관리 콘솔**: [Google Cloud Console](https://console.cloud.google.com/)
- **필요 정보**:
  - `GOOGLE_CLIENT_ID`: 클라이언트 ID
  - `GOOGLE_CLIENT_SECRET`: 클라이언트 보안 비밀
- **설정 위치**: `apps/backend/.env`

---

## 2. 클라우드 스토리지 (Cloudflare R2)

이미지 및 정적 파일 저장을 위해 Cloudflare R2(S3 호환 스토리지)를 사용합니다.

- **용도**: 프로필 이미지, 문제 이미지 등 파일 저장
- **관리 콘솔**: [Cloudflare Dashboard](https://dash.cloudflare.com/)
- **필요 정보**:
  - `R2_ACCOUNT_ID`: Cloudflare 계정 ID
  - `R2_ACCESS_KEY_ID`: R2 토큰 Access Key
  - `R2_SECRET_ACCESS_KEY`: R2 토큰 Secret Key
  - `R2_BUCKET_NAME`: 사용할 버킷 이름 (예: `peekle`)
  - `R2_PUBLIC_URL`: 공개 접근 가능한 도메인 URL (Custom Domain)
- **설정 위치**: `apps/backend/.env`

---

## 3. 실시간 화상/음성 통신 (LiveKit)

화상 채팅 및 화면 공유 기능을 위해 LiveKit 서버를 자체 호스팅하거나 Cloud 버전을 사용할 수 있습니다. 본 프로젝트는 Docker를 통해 Self-hosted 버전을 사용하도록 구성되어 있습니다.

- **용도**: 게임 룸 내 화상 채팅, 음성 대화, 화면 공유
- **공식 문서**: [LiveKit Docs](https://docs.livekit.io/)
- **필요 정보**:
  - `LIVEKIT_URL`: LiveKit 서버 WebSocket URL (예: `wss://your-domain.com` 또는 내부 통신용 `http://livekit:7880`)
  - `LIVEKIT_API_KEY`: API Key (서버 설정(`livekit.yaml`)과 일치해야 함)
  - `LIVEKIT_API_SECRET`: API Secret (서버 설정(`livekit.yaml`)과 일치해야 함)
- **설정 위치**:
  - Backend: `apps/backend/.env`
  - Frontend: `apps/frontend/.env` (NEXT_PUBLIC_LIVEKIT_URL)
  - Docker Compose: `docker/docker-compose.prod.yml` (LiveKit 서비스 정의)

---

## 4. AI 서비스 (AI Server)

문제 추천 및 분석을 위한 AI 서버는 내부적으로 Python(FastAPI)과 ChromaDB(Vector DB)를 사용합니다.

- **용도**: 유사 문제 추천, 문제 임베딩 검색
- **구성 요소**:
  - AI Server (FastAPI)
  - ChromaDB (Vector Database)
- **필요 정보**:
  - OpenAI API Key (사용하는 경우): `apps/ai-server/.env` 참고 (현재 코드상 임베딩 모델 확인 필요)
  - ChromaDB 접속 정보: `CHROMA_HOST`, `CHROMA_PORT`
- **설정 위치**: `apps/ai-server/.env`
