# S7-8. 추천 엔진 (AI)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core (AI)
**Priority:** Medium
**Estimate:** 8 Story Points

---

## 🧾 User Story

**As a** 사용자
**I want to** 내 티어와 약점에 기반한 "다음 문제" 추천을 받고 싶다
**So that** 효율적으로 실력을 향상시킬 수 있다

---

## ✅ Acceptance Criteria

- [ ] 사용자의 오답 패턴(태그)을 분석하여 유사 난이도의 문제를 선별한다.
  - **분석 기간:** 최근 30일 풀이 기록
  - **취약 태그 추출:** 오답률 50% 이상인 알고리즘 태그 (예: DP, 그리디)
  - **난이도 범위:** 현재 티어 ±1 (예: SILVER_3 → SILVER_2~SILVER_4)
  - **추천 개수:** 5개 (1일 1회 갱신)
- [ ] LLM을 이용해 "추천 사유"를 생성하고 Redis에 캐싱하여 제공한다.
  - **LLM 모델:** GPT-4o-mini (비용 효율적)
  - **프롬프트 구조:** "유저 {닉네임}은 {티어}이며, {태그}에 약합니다. 문제 {제목}을 추천하는 이유를 친근하게 2문장으로 설명해주세요."
  - **예시 출력:** "BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪"
  - **캐싱:** Redis `user:{id}:recommendations` (24시간 TTL)
- [ ] **트리거:**
  - 매일 06:00 배치 작업 (전체 유저)
  - 유저 요청 시 (`GET /api/v1/recommendations/me`) - 캐시 없으면 즉시 생성
- [ ] **폴백:** AI 서비스 실패 시 규칙 기반 추천 (취약 태그 기반, 사유 없음)

---

## 🏗️ Technical Architecture

**추천 생성 플로우:**

1. [배치 또는 API 호출] → Spring Boot `RecommendationService.generate(userId)`
2. MySQL 조회: 최근 30일 풀이 기록 (`SUBMISSION_LOGS`)
3. 취약 태그 분석: 태그별 정답률 계산 (오답률 50% 이상 추출)
4. ChromaDB 검색: 취약 태그 기반, 티어 ±1, 이미 푼 문제 제외
5. 우선순위 랭킹: 취약도 × 티어 근접도
6. LLM 사유 생성: Python AI Service `/generate-reason` 호출
7. Redis 저장: `user:{id}:recommendations` (24시간 TTL)
8. 응답 반환

**Redis 데이터 구조:**

```json
{
  "userId": 123,
  "generatedAt": "2026-01-20T06:00:00Z",
  "recommendations": [
    {
      "problemId": 1260,
      "title": "DFS와 BFS",
      "tier": "SILVER_2",
      "source": "BOJ",
      "weakTag": "그래프 탐색",
      "reason": "BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪",
      "relevanceScore": 0.92
    }
  ]
}
```

**LLM 프롬프트 (GPT-4o-mini):**

```
You are a friendly algorithm tutor for Peekle, a gamified coding platform.

User Profile:
- Nickname: {nickname}
- Tier: {tier}
- Weak Areas: {weakTags} (정답률 {accuracyRate}%)

Recommended Problem:
- Title: {problemTitle}
- Tier: {problemTier}
- Algorithm Tag: {algorithmTag}

Task:
Write a warm, encouraging recommendation reason in Korean (2 sentences max, 50 chars max).
Use emoji sparingly (1-2 max). Explain why this problem will help improve their weak area.

Example Output:
"BFS 문제를 많이 틀리셨네요! 이 문제는 기본 BFS 패턴을 익히기 딱 좋습니다. 💪"
```

---

## 🛠 Implementation Tasks

- [ ] **사용자 취약 태그 분석**
  - [ ] `UserWeaknessAnalyzer` 서비스 구현
    - [ ] 최근 30일 풀이 기록 조회 (QueryDSL)
    - [ ] 태그별 정답률 계산
    - [ ] 오답률 50% 이상 태그 추출
    - [ ] 폴백: 데이터 부족 시 현재 티어 평균 문제
  - [ ] 단위 테스트 (Mock 데이터)
- [ ] **문제 추출 로직**
  - [ ] `RecommendationCandidateService` 구현
    - [ ] ChromaDB 검색 (취약 태그 기반)
    - [ ] 티어 필터링 (±1 범위)
    - [ ] 풀이 여부 제외 (Redis Set 조회)
    - [ ] 우선순위 랭킹 (취약도 × 티어 근접도)
    - [ ] Top 5 선정
- [ ] **GPT-4o-mini 사유 생성**
  - [ ] Python AI Service `/generate-reason` 엔드포인트
    - [ ] OpenAI API 클라이언트
    - [ ] 프롬프트 템플릿 엔진 (Jinja2)
    - [ ] 배치 처리 (5개 문제 한 번에)
    - [ ] 응답 파싱 및 검증 (길이 체크)
  - [ ] Spring Boot 연동
    - [ ] `LLMReasonService` (WebClient)
    - [ ] 타임아웃 설정 (10초)
    - [ ] 폴백: 실패 시 기본 메시지
- [ ] **Redis 캐싱**
  - [ ] `RecommendationCacheService` 구현
    - [ ] 저장: `user:{id}:recommendations` (JSON)
    - [ ] TTL: 24시간
    - [ ] 조회: 캐시 히트 시 즉시 반환
  - [ ] 캐시 무효화 정책
    - [ ] 유저 티어 승급/강등 시 삭제
    - [ ] 수동 갱신 API
- [ ] **배치 작업** (Spring Batch)
  - [ ] `DailyRecommendationJob` 구현
    - [ ] 전체 유저 조회 (활성 유저만)
    - [ ] 청크 처리 (100명씩)
    - [ ] 추천 생성 및 Redis 저장
    - [ ] 실패 로그 기록
  - [ ] 스케줄러: 매일 06:00
- [ ] **API 엔드포인트**
  - [ ] `GET /api/v1/recommendations/me`
  - [ ] `POST /api/v1/recommendations/refresh`
- [ ] **Frontend 연동**
  - [ ] `useRecommendations` 훅
  - [ ] 대시보드 추천 카드 섹션
  - [ ] 로딩/빈 상태 UI
- [ ] **모니터링 및 분석**
  - [ ] 추천 클릭률 추적
  - [ ] LLM 비용 모니터링
  - [ ] 추천 정확도 피드백 수집

---

## 🔗 Dependencies

- **Depends on:** S7-6 (문제 임베딩 파이프라인)
- **Blocks:** N/A

---

## 📝 Notes

- GPT-4o-mini 비용은 매우 저렴하지만 (1M tokens ~$0.15) 대량 유저 시 모니터링 필수
- 추천 정확도 개선을 위해 사용자 피드백 수집 (유용함/별로 버튼)
- 배치 작업 실패 시 알림 설정 (Slack/Mattermost)
