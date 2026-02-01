# S7-6. 문제 임베딩 파이프라인 (AI)

**Epic:** Epic-06 - Discovery & Recommendation
**Domain:** Team Core (AI)
**Priority:** High
**Estimate:** 8 Story Points

---

## 🧾 User Story

**As a** 시스템
**I want to** 문제 설명을 벡터 임베딩으로 변환하고 싶다
**So that** 키워드가 일치하지 않아도 의미적으로 유사한 문제를 찾을 수 있다

---

## ✅ Acceptance Criteria

- [ ] 신규 문제 추가 시 AI 모델을 통해 설명을 벡터화하고 Vector DB(ChromaDB)에 인덱싱해야 한다.
  - **트리거:** `POST /api/v1/problems` 또는 배치 작업 시 자동 실행
  - **임베딩 모델:** OpenAI `text-embedding-3-small` (1536 dim) 또는 로컬 모델 (sentence-transformers)
  - **Vector DB:** ChromaDB (Docker 컨테이너, localhost:8000)
- [ ] **배치 초기화:** 기존 문제 데이터 일괄 임베딩 (Spring Batch)
  - **스케줄:** 최초 1회 실행 + 주간 갱신 (매주 일요일 03:00)
  - **청크 사이즈:** 100개씩 처리
- [ ] **데이터 전처리:**
  - HTML 태그 제거
  - 특수문자 정규화
  - 한글 + 영문 혼합 처리
  - 최대 길이: 8000 토큰 (모델 제한)
- [ ] **에러 핸들링:**
  - 임베딩 실패 시 재시도 3회 (exponential backoff)
  - 실패한 문제 ID 로깅 (`embedding_failures` 테이블)

---

## 🏗️ Technical Architecture

**Option A: Python FastAPI Microservice (추천)**

```python
# AI Service (Python FastAPI)
POST /embed
Request: { "texts": ["문제 설명 1", "문제 설명 2"] }
Response: { "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]] }

# ChromaDB Integration
import chromadb
client = chromadb.HttpClient(host="localhost", port=8000)
collection = client.get_or_create_collection("problems")
collection.add(ids=["1000"], embeddings=[[...]], metadatas=[{"title": "A+B"}])
```

**Data Flow:**

1. Spring Boot → POST /api/v1/problems (문제 생성)
2. Spring Boot → 비동기 이벤트 발행 (`ProblemCreatedEvent`)
3. EventListener → Python AI Service 호출 (임베딩 요청)
4. AI Service → OpenAI API 또는 로컬 모델
5. AI Service → ChromaDB에 벡터 저장
6. AI Service → Spring Boot에 완료 응답
7. Spring Boot → MySQL `problems` 테이블에 `is_embedded = true` 업데이트

---

## 🛠 Implementation Tasks

- [ ] **Python AI Service 구축** (`apps/ai-service/`)
  - [ ] FastAPI 프로젝트 초기화 (`poetry init`)
  - [ ] `/embed` 엔드포인트 구현
    - [ ] OpenAI API 클라이언트 (`openai` 라이브러리)
    - [ ] 배치 처리 (최대 100개씩)
    - [ ] 에러 핸들링 및 재시도 로직
  - [ ] ChromaDB 클라이언트 연결
    - [ ] `problems` 컬렉션 생성
    - [ ] 메타데이터 스키마 정의 (`id`, `title`, `source`, `tier`)
  - [ ] Dockerfile 작성 (경량 Python 이미지)
  - [ ] Health Check 엔드포인트 (`GET /health`)
- [ ] **Spring Boot 연동**
  - [ ] `EmbeddingService` 구현
    - [ ] RestTemplate 또는 WebClient로 AI Service 호출
    - [ ] 비동기 처리 (`@Async`)
  - [ ] `ProblemCreatedEvent` 이벤트 리스너
  - [ ] `is_embedded` 플래그 관리 (PROBLEMS 테이블 컬럼 추가)
- [ ] **배치 작업** (Spring Batch)
  - [ ] `EmbeddingBatchJob` 구현
    - [ ] `is_embedded = false` 문제 조회
    - [ ] 100개씩 청크 처리
    - [ ] AI Service 호출 및 결과 저장
  - [ ] 실패 로그 테이블 (`EMBEDDING_FAILURES`)
  - [ ] 스케줄러 설정 (`@Scheduled`)
- [ ] **ChromaDB Docker 설정**
  - [ ] `docker-compose.yml`에 ChromaDB 서비스 추가
  - [ ] 볼륨 마운트 (데이터 영속성)
  - [ ] 포트 매핑 (8000:8000)
- [ ] **데이터 전처리 유틸리티**
  - [ ] HTML 파싱 (`Jsoup` 또는 Python `BeautifulSoup`)
  - [ ] 텍스트 정규화 함수
  - [ ] 토큰 길이 체크 (tiktoken 라이브러리)
- [ ] **모니터링 및 로깅**
  - [ ] 임베딩 성공률 메트릭
  - [ ] 평균 처리 시간 로깅
  - [ ] 실패 원인 분석 (API 할당량 초과 등)

---

## 🔗 Dependencies

- **Depends on:** N/A (독립적)
- **Blocks:** S7-2 (검색 API 래퍼), S7-7 (시맨틱 검색 로직), S7-8 (추천 엔진)

---

## 📝 Notes

- OpenAI API 비용 모니터링 필수 (임베딩 비용은 저렴하지만 대량 처리 시 고려)
- 로컬 모델 사용 시 `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` 권장
- ChromaDB는 메모리 기반이므로 대용량 데이터 시 디스크 기반 대안(Qdrant 등) 검토 필요
