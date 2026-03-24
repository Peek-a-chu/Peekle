# 힐끔힐끔코딩 (Peekle)

<!-- 대표 이미지가 있으면 docs/images/peekle-cover.png 같은 경로로 넣기 -->
<!-- ![Peekle 대표 이미지](docs/images/peekle-cover.png) -->

> 알고리즘 학습을 **혼자 푸는 문제풀이**에서 **함께 성장하는 실시간 협업 학습**으로 확장한 AI 기반 코딩 스터디 플랫폼입니다.

---

## Links

- **Service**: [peekle.today](https://peekle.today)
- **Repository**: [Peekle GitHub](https://github.com/Peek-a-chu/Peekle)

- **Chrome Extension**: [확장프로그램 링크](https://chromewebstore.google.com/detail/lgcgoodhgjalkdncpnhnjaffnnpmmcjn?utm_source=item-share-cb)

---

## 프로젝트 소개

**힐끔힐끔코딩(Peekle)**은 알고리즘 학습을 단순 제출 기록 관리에 머무르지 않고,  
**스터디 협업 · 실시간 소통 · 경쟁형 게임 · 리그 기반 동기부여 · AI 추천 · 브라우저 확장프로그램 자동 연동**까지 하나의 흐름으로 통합한 플랫폼입니다.

문제를 “혼자 푸는 경험”에서 끝내지 않고,  
함께 문제를 풀고, 서로의 풀이 과정을 보고, 제출 결과를 자동으로 기록하고, 다음 문제까지 추천받을 수 있도록 설계했습니다.

---

## 해결하려는 문제

기존 알고리즘 학습 환경에는 이런 불편이 있었습니다.

- 혼자 공부할 때 쉽게 흐트러지는 학습 몰입도
- 막힌 문제를 제때 해결하지 못하는 피드백 지연
- 실력 성장 체감이 어려운 정적인 학습 경험
- 문제 풀이 플랫폼과 스터디/협업 도구가 분리된 비효율
- 제출 기록을 수동으로 관리해야 하는 번거로움

Peekle은 이 문제를 해결하기 위해  
**학습 + 협업 + 경쟁 + 추천 + 자동 기록**을 하나의 서비스로 연결했습니다.

---

## 핵심 기능

### 1. 실시간 스터디 룸
- 스터디 생성 / 참여 / 초대 코드 기반 입장
- 문제 캘린더 기반 커리큘럼 운영
- 실시간 채팅, 코드 공유, 제출 코멘트 지원
- 화상 / 음성 기반 협업 환경 제공

### 2. 협업 IDE + 테스트케이스 러너
- Monaco 기반 웹 IDE
- 언어 전환 및 실시간 코드 관전
- 스냅샷 동기화 지원
- 스터디 문제 단위 테스트케이스 저장 / 실행 기능 제공

### 3. 경쟁형 게임 모드
- `TIME_ATTACK`, `SPEED_RACE` 지원
- `개인전 / 팀전` 지원
- 게임방 생성, 비밀번호 입장, 초대 코드, Ready / Start 흐름 제공
- 실시간 채팅, 코드 공유, 제출, 기권, 재접속 복구, 결과 모달까지 상태 동기화 처리

### 4. 리그 / 포인트 시스템
- 주간 점수 요약 및 리그 진행 추이 제공
- 승급 / 강등 상태와 히스토리 랭킹 조회 가능
- 학습 지속성을 높이기 위한 경쟁형 구조 도입

현재 리그 체계는 아래 8개 티어로 구성됩니다.

`STONE → BRONZE → SILVER → GOLD → PLATINUM → EMERALD → DIAMOND → RUBY`

### 5. AI 맞춤 문제 추천
- 최근 풀이 로그, 태그 정확도, 강점/약점 태그, 오랜 미풀이 태그를 기반으로 후보 문제 점수화
- Gemini 기반 LLM이 약점 보완 / 안정형 / 도전형 / 복습형 관점을 반영해 **하루 3개 문제 추천**
- pgvector 임베딩 유사도를 혼합해 최종 재정렬

### 6. 백준(BOJ) 확장프로그램 연동
- Chrome Extension(MV3)이 백준 채점 현황을 감지
- 결과 / 메모리 / 시간 / 언어 / 소스코드를 자동 수집
- 서버에 제출 정보를 자동 동기화
- 스터디 / 게임 컨텍스트를 구분해 제출 처리
- 게임 컨텍스트에서는 언어 / 코드 길이 검증으로 오제출 방지

---

## 프로젝트 차별점

- **학습 + 협업 + 경쟁 + 추천**을 각각 분리하지 않고 하나의 서비스 흐름으로 연결
- 제출 **결과**뿐 아니라 풀이 **과정**까지 실시간으로 공유
- 확장프로그램 기반 자동 수집으로 수동 기록 부담 최소화
- 리그 / 포인트 / 게임 모드로 학습 지속성을 높이는 구조
- 단순 문제 추천이 아니라 사용자 풀이 데이터 기반의 **개인화 추천** 제공

---

## 서비스 흐름

1. 사용자는 소셜 로그인 후 스터디 또는 게임에 참여합니다.
2. 스터디에서는 실시간 코드, 화상/음성, 채팅, 화이트보드로 함께 협업합니다.
3. 사용자가 백준에 제출하면 확장프로그램이 결과를 감지해 백엔드에 동기화합니다.
4. 백엔드는 제출 로그를 반영해 점수, 리그, 타임라인을 업데이트합니다.
5. AI 서버는 사용자 활동 데이터를 바탕으로 당일 추천 문제를 생성합니다.
6. 사용자는 홈 대시보드에서 리그 추이, 스트릭, 주간 점수, 학습 타임라인을 확인합니다.

---

## 기술 아키텍처

- **Frontend (Next.js)**  
  사용자 화면, 대시보드, 스터디/게임 UI, API 라우트

- **Backend (Spring Boot)**  
  인증, 도메인 로직, 실시간 소켓, 리그/점수/제출 처리

- **AI Server (FastAPI)**  
  추천 생성, 임베딩 인덱싱, 유사도 계산

- **Extension (Chrome MV3)**  
  백준 제출 감지 및 서비스 연동

---

## Tech Stack

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn/UI, TanStack Query, Zustand |
| Realtime | STOMP/SockJS WebSocket, LiveKit(WebRTC), Monaco Editor |
| Backend | Spring Boot 3.4, Java 21, Spring Security(OAuth2/JWT), JPA, QueryDSL, Flyway |
| Data | PostgreSQL, Redis, pgvector |
| AI | FastAPI, OpenAI-compatible Gemini API, 임베딩 기반 하이브리드 추천 |
| Storage / Infra | Cloudflare R2(S3 SDK), Docker Compose, Nginx, Certbot |
| Extension | Chrome Extension Manifest V3, content script, background script |

---

## 프로젝트 구조

```text
Peekle/
  apps/
    frontend/      # Next.js 웹 서비스
    backend/       # Spring Boot API + WebSocket
    ai-server/     # FastAPI 추천/임베딩 서버
    extension/     # BOJ 연동 크롬 확장프로그램
  docker/          # dev/prod compose, nginx/livekit/postgres 설정
  docs/            # 기획/스펙/아키텍처 문서
