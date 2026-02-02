# Backend Dockerfile for Spring Boot
# Multi-stage build for optimized production image

# Stage 1: Builder
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy gradle files
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable
RUN chmod +x gradlew

# Download dependencies with cache mount (BuildKit optimization)
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build the application with build cache enabled
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --build-cache --parallel -x test

# Extract layers for optimized docker caching
RUN java -Djarmode=layertools -jar build/libs/*.jar extract --destination build/extracted

# Stage 2: Runner
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Copy extracted layers
# 1. Dependencies (libraries) - changing least often
COPY --from=builder /app/build/extracted/dependencies/ ./
# 2. Spring Boot Loader
COPY --from=builder /app/build/extracted/spring-boot-loader/ ./
# 3. Snapshot Dependencies
COPY --from=builder /app/build/extracted/snapshot-dependencies/ ./
# 4. Application Code - changing most often
COPY --from=builder /app/build/extracted/application/ ./

# Run via JarLauncher for layered jar support
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]

# Install su-exec
RUN apk add --no-cache su-exec

# Create non-root user
RUN addgroup --system --gid 1001 spring && \
    adduser --system --uid 1001 --ingroup spring spring

# Copy the built jar
COPY --from=builder /app/build/libs/*.jar app.jar

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R spring:spring /app

USER root

EXPOSE 8080

# JVM options for container environment
# Enable ZGC (Generational ZGC) for low latency and high scalability
# UseStringDeduplication to reduce memory usage
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseZGC -XX:+ZGenerational -XX:+UseStringDeduplication -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
