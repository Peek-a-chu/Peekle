# S2-5. WebRTC 인프라 (LiveKit) (DevOps)

## 📌 Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-5
- **Sprint**: Week 2 (Migration Sprint)
- **Estimated Effort**: 1 day
- **Priority**: Critical
- **Dependencies**: S2-3 (CI/CD)
- **Status**: Ready

---

## 🧾 User Story

**As a** DevOps 엔지니어
**I want to** 프로덕션 서버(i14a408.p.ssafy.io)에 LiveKit 인프라를 배포하고 싶다
**So that** 안정적인 WebRTC 서비스를 제공하고, Backend/Frontend 코드와 연동하여 서비스를 제공할 수 있기 때문이다.

---

## ✅ Acceptance Criteria

1. ✓ Coturn 서버가 EC2 호스트 네트워크 모드로 실행되어야 한다.
2. ✓ LiveKit 서버가 `config.yaml`을 통해 Redis 및 API Key 설정을 로드해야 한다.
3. ✓ LiveKit 서버가 외부 IP(i14a408.p.ssafy.io)를 통해 접근 가능해야 한다.
4. ✓ Backend (`MediaService.java`)가 LiveKit 서버와 통신하여 정상적으로 토큰을 발급해야 한다.

---

## 🛠 Implementation Tasks

### Task 1: Coturn 설정 (프로덕션 환경)

**파일 위치**: `docker/coturn/turnserver.conf`

**구성 내용**:
EC2 배포 환경에 맞춰 공인 IP와 도메인, 보안 설정을 구체화합니다.

```conf
# 포트 설정
listening-port=3478
tls-listening-port=5349

# IP 및 도메인 설정 (프로덕션 IP 확인 필수)
# 배포 스크립트에서 sed로 치환하거나, 고정 IP 기입
external-ip=${EC2_PUBLIC_IP}
realm=i14a408.p.ssafy.io

# 인증 (Backend와 일치시켜야 함)
user=peekle:peekle_turn_password

# 포트 범위 (AWS Security Group 아웃바운드 허용 필요)
min-port=49152
max-port=65535

# 보안
fingerprint
no-multicast-peers
no-stun # LiveKit이 STUN 역할을 겸할 수 있으므로 Coturn은 TURN 전용으로 운영 권장
```

### Task 2: LiveKit 서버 구성 (구체화)

LiveKit은 `host` 네트워크 모드를 사용하여 UDP 성능을 극대화합니다. Redis는 Docker 네트워크 내부(`redis`)가 아닌, 호스트 포트(`localhost:6379`)를 통해 접근합니다.

#### 2-1. LiveKit 설정 파일 (`docker/livekit/livekit.yaml`)

```yaml
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
  
  # 중요: 배포 서버의 공인 IP 탐지를 위한 설정
  # AWS EC2의 경우 자동으로 탐지되거나, 명시적으로 지정 필요
  # node_ip: "YOUR.EC2.PUBLIC.IP"

redis:
  # LiveKit이 host 모드이므로, 로컬의 Redis 포트로 접근
  address: 127.0.0.1:6379
  password: "peekle-redis-password" # .env의 REDIS_PASSWORD와 일치 확인
  db: 0

keys:
  # .env 파일 또는 Docker 환경 변수에서 주입받지 않고 YAML에 명시할 경우:
  # API Key : Secret Key (최소 32자 이상)
  # backend/src/main/resources/application-prod.yml 의 livekit 설정과 일치해야 함
  livekit_api_key: "peekle_livekit_secret_at_least_32_chars_long"

turn:
  enabled: true
  domain: i14a408.p.ssafy.io
  tls_port: 5349
  udp_port: 3478
  external_tls: true
```

#### 2-2. Docker Compose 서비스 추가 (`docker-compose.prod.yml`)

기존 `docker-compose.prod.yml`에 LiveKit 서비스를 추가합니다.

```yaml
  # LiveKit Server
  livekit:
    image: livekit/livekit-server:v1.8.0
    container_name: peekle-livekit
    command: --config /livekit.yaml
    restart: unless-stopped
    network_mode: host # 성능상 필수
    volumes:
      - ./livekit/livekit.yaml:/livekit.yaml
    environment:
      # .env 파일의 값을 오버라이드하거나 주입
      - LIVEKIT_KEYS_API_KEY=peekle_livekit_secret_at_least_32_chars_long
```

### Task 3: Backend 연동 확인 포인트

배포 후 다음 파일들이 올바르게 LiveKit을 가리키고 있는지 확인해야 합니다.

1.  **`apps/backend/src/main/resources/application-prod.yml`**
    ```yaml
    livekit:
      url: ws://localhost:7880 # LiveKit이 Host 모드이므로 localhost 접근 가능
      api-key: livekit_api_key
      api-secret: peekle_livekit_secret_at_least_32_chars_long
    ```

2.  **`MediaService.java`**
    *   `Token` 생성 시 `application.yml`의 키 값을 정상적으로 로드하는지 확인.
    *   기존 `StudySocketController.java`에 있던 Socket 연결 로직 제거 및 REST API 전환 필요 (별도 리팩토링 태스크).

### Task 4: 방화벽(Security Group) 설정

AWS EC2 Security Group에서 다음 포트를 반드시 개방해야 합니다.

*   **TCP**: 7880 (API/Signal), 7881 (RTC-TCP), 5349 (TURN-TLS)
*   **UDP**: 7882 (RTC-UDP), 3478 (TURN), 49152-65535 (Media Range)

---

## 🧪 Deployment Verification

1.  **컨테이너 실행 확인**
    ```bash
    docker logs peekle-livekit
    # "starting LiveKit server..." 및 Redis 연결 성공 메시지 확인
    ```

2.  **Backend Token 발급 테스트**
    *   Swagger 또는 Postman을 통해 `POST /api/studies/{id}/media/token` 호출
    *   JWT 토큰이 정상적으로 반환되는지 확인

3.  **Frontend 접속 테스트**
    *   `app.peekle.io` (또는 개발 도메인) 접속 후 룸 입장
    *   Chrome `chrome://webrtc-internals`에서 `connected` 상태 확인

---

## 📦 Deliverables

- [ ] `docker/livekit/livekit.yaml` 파일 작성 (Redis 비밀번호 포함)
- [ ] `docker-compose.prod.yml`에 LiveKit 서비스 정의 추가
- [ ] AWS Security Group 인바운드 규칙 업데이트
