# S2-2. 프로젝트 초기 설정 (Backend)

## 📌 Story Information
- **Epic**: Epic-02 (Infrastructure)
- **Story ID**: S2-2
- **Sprint**: Week 1 (Days 1-7)
- **Estimated Effort**: 1-2 days
- **Priority**: Critical
- **Dependencies**: None

---

## 🧾 User Story

**As a** 백엔드 개발자
**I want to** 필요한 의존성으로 Spring Boot 프로젝트를 설정하고 싶다
**So that** API 구축을 시작할 수 있어야 하기 때문이다

---

## ✅ Acceptance Criteria

1. ✓ Spring Boot 3.4.x 애플리케이션이 성공적으로 실행되어야 한다
2. ✓ `docker compose up` 실행 시 Redis 컨테이너가 정상 작동해야 한다
3. ✓ 외부 서버에서 제공되는 MySQL 데이터베이스 연결이 성공해야 한다
4. ✓ 전역 에러 처리 및 공통 DTO 패턴이 수립되어야 한다

---

## 🛠 Implementation Tasks

### Task 1: Spring Boot 프로젝트 생성

**Spring Initializr 설정:**
- **Project**: Gradle - Groovy
- **Language**: Java
- **Spring Boot**: 3.4.13 (최신 stable)
- **Java**: 21
- **Packaging**: Jar
- **Group**: com.peekle
- **Artifact**: backend
- **Name**: Peekle Backend
- **Package name**: com.peekle

**Dependencies:**
```
- Spring Web
- Spring Data JPA
- Spring Data Redis
- Spring Security
- OAuth2 Client
- Validation
- Lombok
- MySQL Driver
- Spring Boot DevTools
- Spring Boot Actuator
- WebSocket
```

**생성 방법:**
```bash
# Option 1: Web UI
# https://start.spring.io 에서 위 설정으로 생성 후 apps/backend에 압축 해제

# Option 2: CLI
curl https://start.spring.io/starter.zip \
  -d type=gradle-project \
  -d language=java \
  -d bootVersion=3.4.1 \
  -d baseDir=backend \
  -d groupId=com.peekle \
  -d artifactId=backend \
  -d name=peekle-backend \
  -d packageName=com.peekle \
  -d javaVersion=21 \
  -d dependencies=web,data-jpa,data-redis,security,oauth2-client,validation,lombok,mysql,devtools,actuator,websocket \
  -o backend.zip

unzip backend.zip -d apps/
```

**예상 프로젝트 구조:**
```
apps/backend/
├── src/
│   ├── main/
│   │   ├── java/com/peekle/
│   │   │   ├── PeekleApplication.java
│   │   │   ├── api/          # Controllers
│   │   │   ├── domain/        # Entities, Repositories, Services
│   │   │   ├── global/        # Config, Exception, Utils
│   │   │   └── infra/         # Redis, OpenVidu, External
│   │   └── resources/
│   │       ├── application.yml
│   │       └── application-dev.yml
│   └── test/
├── build.gradle
└── settings.gradle
```

### Task 2: build.gradle 의존성 정리

**`build.gradle` 최종 구성:**
```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.4.1'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.peekle'
version = '0.0.1-SNAPSHOT'

java {
    sourceCompatibility = '21'
}

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-websocket'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    // Database
    runtimeOnly 'com.mysql:mysql-connector-j'

    // JWT
    implementation 'io.jsonwebtoken:jjwt-api:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.5'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.5'

    // Lombok
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // QueryDSL
    implementation 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
    annotationProcessor 'com.querydsl:querydsl-apt:5.1.0:jakarta'
    annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
    annotationProcessor 'jakarta.persistence:jakarta.persistence-api'

    // DevTools
    developmentOnly 'org.springframework.boot:spring-boot-devtools'

    // Test
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') {
    useJUnitPlatform()
}

// QueryDSL 설정
def querydslDir = layout.buildDirectory.dir("generated/querydsl").get().asFile

sourceSets {
    main.java.srcDirs += [querydslDir]
}

tasks.withType(JavaCompile).configureEach {
    options.generatedSourceOutputDirectory = file(querydslDir)
}

clean {
    delete file(querydslDir)
}
```

### Task 3: Docker Compose - Redis 설정

**`docker/docker compose.yml` 파일 생성:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: peekle-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass peekle-redis-password
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: peekle-redis-commander
    environment:
      - REDIS_HOSTS=local:redis:6379:0:peekle-redis-password
    ports:
      - "8081:8081"
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
    driver: local
```

**Redis 실행 및 검증:**
```bash
cd docker
docker compose up -d

# 상태 확인
docker compose ps

# Redis 접속 테스트
docker exec -it peekle-redis redis-cli -a peekle-redis-password
# > ping
# PONG

# Redis Commander 접속
# http://localhost:8081
```

### Task 4: application.yml 설정

**`src/main/resources/application.yml`:**
```yaml
spring:
  profiles:
    active: dev

  application:
    name: peekle-backend

  jpa:
    open-in-view: false
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        highlight_sql: true
    hibernate:
      ddl-auto: validate

  data:
    redis:
      host: localhost
      port: 6379
      password: peekle-redis-password

server:
  port: 8080
  shutdown: graceful

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized

logging:
  level:
    com.peekle: INFO
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

**`src/main/resources/application-dev.yml`:**
```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:peekle}?serverTimezone=Asia/Seoul&characterEncoding=UTF-8
    username: ${DB_USERNAME:peekle_user}
    password: ${DB_PASSWORD:peekle_password}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000

  jpa:
    show-sql: true
    hibernate:
      ddl-auto: update

logging:
  level:
    com.peekle: DEBUG
```

**환경변수 설정 (.env 파일 - Git 제외):**
```bash
# .env.example (템플릿)
DB_HOST=외부제공된호스트
DB_PORT=3306
DB_NAME=peekle
DB_USERNAME=peekle_user
DB_PASSWORD=secure_password
REDIS_PASSWORD=peekle-redis-password
```

### Task 5: GlobalExceptionHandler 구현

**`src/main/java/com/peekle/global/exception/ErrorCode.java`:**
```java
package com.peekle.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Common
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_001", "서버 내부 오류가 발생했습니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON_003", "허용되지 않은 HTTP 메서드입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_001", "사용자를 찾을 수 없습니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "USER_002", "이미 사용 중인 닉네임입니다."),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_002", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "만료된 토큰입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
```

**`src/main/java/com/peekle/global/exception/BusinessException.java`:**
```java
package com.peekle.global.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
```

**`src/main/java/com/peekle/global/exception/GlobalExceptionHandler.java`:**
```java
package com.peekle.global.exception;

import com.peekle.global.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.error("BusinessException: {}", e.getMessage(), e);
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        log.error("MethodArgumentNotValidException: {}", e.getMessage(), e);
        String message = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE.getCode(), message));
    }

    @ExceptionHandler(BindException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBindException(BindException e) {
        log.error("BindException: {}", e.getMessage(), e);
        String message = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE.getCode(), message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException e) {
        log.error("MethodArgumentTypeMismatchException: {}", e.getMessage(), e);
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE.getCode(), "요청 파라미터 타입이 올바르지 않습니다."));
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Unexpected Exception: {}", e.getMessage(), e);
        return ResponseEntity
                .internalServerError()
                .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
    }
}
```

### Task 6: ApiResponse 공통 DTO 클래스 작성

**`src/main/java/com/peekle/global/dto/ApiResponse.java`:**
```java
package com.peekle.global.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final ErrorDetail error;

    @Getter
    @AllArgsConstructor
    public static class ErrorDetail {
        private final String code;
        private final String message;
    }

    // Success responses
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>(true, null, null);
    }

    // Error responses
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message));
    }
}
```

### Task 7: Redis Configuration

**`src/main/java/com/peekle/global/config/RedisConfig.java`:**
```java
package com.peekle.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host}")
    private String host;

    @Value("${spring.data.redis.port}")
    private int port;

    @Value("${spring.data.redis.password}")
    private String password;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(host);
        config.setPort(port);
        config.setPassword(password);
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

---

## 🧪 Testing & Validation

### 1. 애플리케이션 실행 테스트
```bash
cd apps/backend
./gradlew bootRun
```
**예상 결과:**
```
Started PeekleApplication in 3.245 seconds
```

### 2. Redis 연결 테스트
```bash
# Health Check API 호출
curl http://localhost:8080/api/health

# 예상 응답
{
  "success": true,
  "data": {
    "status": "UP",
    "application": "Peekle Backend",
    "redis": "UP"
  },
  "error": null
}
```

### 3. MySQL 연결 테스트
**간단한 테스트 엔티티 생성 후 확인:**
```java
@Entity
@Table(name = "connection_test")
public class ConnectionTest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
```

애플리케이션 실행 시 테이블 자동 생성 확인 (`ddl-auto: update`)

### 4. 에러 핸들링 테스트
**테스트 컨트롤러 작성:**
```java
@GetMapping("/test/error")
public ApiResponse<Void> testError() {
    throw new BusinessException(ErrorCode.USER_NOT_FOUND);
}
```

**호출 및 검증:**
```bash
curl http://localhost:8080/api/test/error

# 예상 응답
{
  "success": false,
  "data": null,
  "error": {
    "code": "USER_001",
    "message": "사용자를 찾을 수 없습니다."
  }
}
```

### 5. Validation 테스트
```java
@PostMapping("/test/validation")
public ApiResponse<Void> testValidation(@Valid @RequestBody TestRequest request) {
    return ApiResponse.success();
}

record TestRequest(
    @NotBlank(message = "이름은 필수입니다.")
    String name
) {}
```

```bash
curl -X POST http://localhost:8080/api/test/validation \
  -H "Content-Type: application/json" \
  -d '{}'

# 예상 응답
{
  "success": false,
  "data": null,
  "error": {
    "code": "COMMON_002",
    "message": "이름은 필수입니다."
  }
}
```

---

## 📦 Deliverables

- [x] Spring Boot 3.4.x 프로젝트 구조
- [x] Gradle 빌드 설정 (build.gradle)
- [x] Docker Compose (Redis)
- [x] application.yml 설정 (dev/prod 분리)
- [x] GlobalExceptionHandler
- [x] ApiResponse DTO
- [x] RedisConfig
- [x] README.md (프로젝트 실행 방법)

---

## 📚 Related Documents
- [Architecture Design](../../architecture.md)
- [Sprint Plan](../../sprint-plan.md)
- [Epic-02: Infrastructure](../epic-01-infra.md)
- [Database Schema](../../database-schema.md)

---

## 🔗 References
- [Spring Boot 3.4 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.4-Release-Notes)
- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Data JPA](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
- [Spring Data Redis](https://docs.spring.io/spring-data/redis/docs/current/reference/html/)
- [QueryDSL](http://querydsl.com/static/querydsl/latest/reference/html/)

## 📝 Dev Agent Record

### Implementation Plan
- [x] Initialize Spring Boot project
- [x] Configure build.gradle
- [x] Setup Docker Compose for Redis
- [x] Configure application.yml (dev/prod)
- [x] Implement GlobalExceptionHandler
- [x] Create ApiResponse DTO
- [x] Configure Redis
- [x] README.md

### Completion Notes
Successfully initialized backend project with Spring Boot 3.4.1. Configured Redis, MySQL drivers, Exception Handling, and DTOs. Tests passing locally using H2. Docker Compose file created but verified only statically due to WSL limitations.

## 📂 File List
- apps/backend/build.gradle
- apps/backend/src/main/resources/application.yml
- apps/backend/src/main/resources/application-dev.yml
- apps/backend/src/main/java/com/peekle/global/exception/ErrorCode.java
- apps/backend/src/main/java/com/peekle/global/exception/BusinessException.java
- apps/backend/src/main/java/com/peekle/global/exception/GlobalExceptionHandler.java
- apps/backend/src/main/java/com/peekle/global/dto/ApiResponse.java
- apps/backend/src/main/java/com/peekle/global/config/RedisConfig.java
- apps/backend/README.md
- docker/docker-compose.yml

## 🔄 Change Log
- Initial project setup

## 🚦 Status
- [ ] ready-for-dev
- [ ] in-progress
- [x] review
- [ ] done
