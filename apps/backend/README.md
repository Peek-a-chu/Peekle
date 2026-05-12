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

## LeetCode 난이도 데이터

LeetCode 문제의 점수 산정용 난이도는 [ZeroTrac LeetCode Problem Rating](https://github.com/zerotrac/leetcode_problem_rating) 데이터를 사용한다.
해당 저장소는 MIT 라이선스이며, 원문 라이선스는 `src/main/resources/leetcode/ZEROTRAC_LICENSE`에 함께 보관한다.

- 원본 데이터: `https://github.com/zerotrac/leetcode_problem_rating/blob/main/data.json`
- 로컬 시드 파일: `src/main/resources/leetcode/zerotrac-leetcode-ratings.json`
- 저장 테이블: `leetcode_problem_ratings`
- 시드 방식: 애플리케이션 시작 시 테이블이 비어 있으면 JSON을 읽어 적재

ZeroTrac 데이터는 contest 기반 rating이라 일부 오래된 문제나 non-contest 문제를 포함하지 않을 수 있다.
예를 들어 `9. Palindrome Number`는 현재 ZeroTrac 데이터에 없으므로, 이런 문제는 LeetCode 공식 난이도(Easy/Medium/Hard)를 fallback으로 사용한다.

### 후속 이슈

- ZeroTrac 데이터 갱신 주기와 갱신 담당 흐름 정하기
- LeetCode 공식 난이도 fallback을 Peekle 점수 체계에 맞게 조정하기
- ZeroTrac에 없는 문제의 난이도를 별도 수동 보정하거나 내부 데이터로 누적할지 결정하기
