# Peekle Backend

## 실행 방법

### 1. 사전 요구사항
- Java 21
- Docker & Docker Compose

### 2. 환경 설정
1. Docker 컨테이너 실행 (Redis)
   ```bash
   cd ../../docker
   docker compose up -d
   ```

2. 데이터베이스 설정 (.env 또는 환경변수)
   - MySQL은 외부 서버 사용 가정 (application-dev.yml 참조)

### 3. 애플리케이션 실행
```bash
./gradlew bootRun
```

### 4. 테스트
```bash
./gradlew test
```
