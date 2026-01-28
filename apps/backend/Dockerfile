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

# Download dependencies (cache layer)
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src src

# Build the application
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Runner
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

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
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
