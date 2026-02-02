# Stage 1: Builder
FROM python:3.10-slim AS builder

# uv 설치
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# 빌드 의존성 설치 (git 등)
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 가상환경 생성 및 의존성 설치
# /opt/venv 위치에 가상환경 생성
RUN uv venv /opt/venv && \
    uv pip install --no-cache -r requirements.txt --python /opt/venv

# Stage 2: Runner
FROM python:3.10-slim AS runner

WORKDIR /app

# Builder 스테이지에서 가상환경 복사
COPY --from=builder /opt/venv /opt/venv

# PATH 환경변수 설정 (가상환경 우선 순위)
ENV PATH="/opt/venv/bin:$PATH"

# 소스 코드 복사
COPY . .

# 바이트코드 컴파일 (시작 속도 향상)
RUN python -m compileall .

# FastAPI 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]