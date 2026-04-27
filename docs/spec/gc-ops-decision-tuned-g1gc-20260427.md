# GC 운영 반영 결정

- 결정일: 2026-04-27
- 운영 반영 대상: `apps/backend/Dockerfile`
- 운영 JVM profile: tuned G1GC v26
- 기준 환경: 2vCPU / 8GB benchmark profile
- 비교 출처: `g1-ops-strong-validation-summary-20260426.md`, `g1-v24-next-round-summary-20260427.md`

## 최종 결정

운영 환경의 기본 GC를 기존 tuned ZGC 계열에서 tuned G1GC v26으로 전환한다.

적용 옵션:

```text
-XX:+UseG1GC
-XX:+ParallelRefProcEnabled
-XX:InitiatingHeapOccupancyPercent=40
-XX:G1ReservePercent=12
```

## 핵심 비교

| 비교 항목 | Tuned ZGC | Pure G1GC | Tuned G1GC v26 | 운영 판단 |
|---|---:|---:|---:|---|
| 50VU HTTP CPU P95 median | 6134.64ms | 4331.32ms | 4436.72ms | tuned G1GC는 Pure G1GC +5% guard 안쪽 |
| 50VU HTTP+WS CPU P95 median | 4367.10ms | 4762.93ms | 3531.19ms | tuned G1GC가 세 후보 중 가장 안정적 |
| failure max | 0.00% | 1.00% | 0.00% | tuned G1GC와 tuned ZGC 모두 PASS |
| STW max | 87.0ms | 91.3ms | 94.32ms | tuned G1GC가 100ms guard 충족 |
| RSS max | 4.55GiB | 3.23GiB | 3.28GiB | tuned G1GC가 운영 메모리 headroom 확보 |
| 운영 채택 | 보류 | 보류 | 채택 | peak latency, failure, STW, RSS guard를 함께 만족 |

## 근거

- tuned ZGC는 STW 관점에서 유리하지만 RSS가 4.55GiB까지 올라 2vCPU / 8GB 운영 profile에서 memory headroom이 불리하다.
- Pure G1GC는 HTTP CPU P95는 낮지만 HTTP+WS CPU peak와 failure guard에서 tuned G1GC v26보다 불리하다.
- tuned G1GC v26은 `failure=0%`, `STW max <= 100ms`, `RSS <= 3.5GiB`, `50VU HTTP <= Pure G1GC +5%`를 동시에 만족한 운영 후보이다.

## 반영 결과

`apps/backend/Dockerfile`의 기본 `JAVA_OPTS`를 tuned G1GC v26으로 변경했다. `docker-compose.prod.yml`은 별도 `JAVA_OPTS`를 주입하지 않으므로, 운영 배포 컨테이너는 Dockerfile의 기본 JVM 옵션을 사용한다.
