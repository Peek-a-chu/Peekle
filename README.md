# 힐끔힐끔코딩

AI 기반 코딩 스터디 플랫폼입니다.  
문제 풀이, 스터디 협업, 실시간 소통, AI 추천 기능을 하나의 서비스로 제공합니다.

## 프로젝트 소개

힐끔힐끔코딩은 알고리즘 학습을 혼자서 끝내지 않고, 스터디 단위로 함께 지속할 수 있게 설계된 서비스입니다.

- 스터디룸 기반 문제 관리 및 제출 흐름
- 실시간 채팅/웹소켓 기반 협업
- LiveKit 기반 실시간 커뮤니케이션
- Gemini + pgvector 기반 문제 임베딩/추천

## 주요 기능

- 스터디룸 생성/참여 및 멤버 관리
- 날짜별 스터디 문제 등록(기존 문제/커스텀 링크)
- 제출 로그 및 코멘트 기반 피드백
- 태그/티어 기반 AI 문제 추천
- 리그/포인트 기반 학습 동기 부여

## Tech Stack

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind |
| Backend | Spring Boot 3, JPA, Flyway, Redis |
| AI Server | FastAPI, OpenAI-compatible Gemini API, pgvector |
| Infra | Docker Compose, Nginx, LiveKit, PostgreSQL |
| Realtime | WebSocket(STOMP), LiveKit |

## 프로젝트 구조

```text
Peekle/
  apps/
    frontend/      # Next.js
    backend/       # Spring Boot
    ai-server/     # FastAPI + embeddings
    extension/     # browser extension
  docker/
    docker-compose.dev.yml
    docker-compose.prod.yml
```

## 개발 문서

실행 가이드, 환경 변수, 운영/트러블슈팅 문서는 내부 Notion(Private)에서 관리합니다.
