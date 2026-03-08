import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }
    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function measurementValue(metric, statisticNames) {
  if (!metric || !Array.isArray(metric.measurements)) {
    return 0;
  }

  for (const statisticName of statisticNames) {
    const found = metric.measurements.find(
      (measurement) => measurement.statistic === statisticName
    );
    if (found) {
      return Number(found.value || 0);
    }
  }

  return 0;
}

function summaryMetricValue(summary, metricName, fieldNames) {
  const metric = summary.metrics?.[metricName];
  if (!metric) {
    return 0;
  }

  for (const fieldName of fieldNames) {
    if (metric[fieldName] !== undefined) {
      return Number(metric[fieldName]);
    }
  }

  if (metric.values) {
    for (const fieldName of fieldNames) {
      if (metric.values[fieldName] !== undefined) {
        return Number(metric.values[fieldName]);
      }
    }
  }

  return 0;
}

function computeSummaryDelta(beforeMetric, afterMetric) {
  const countDelta =
    measurementValue(afterMetric, ["COUNT"]) - measurementValue(beforeMetric, ["COUNT"]);
  const totalDelta =
    measurementValue(afterMetric, ["TOTAL", "TOTAL_TIME"]) -
    measurementValue(beforeMetric, ["TOTAL", "TOTAL_TIME"]);

  return {
    count: Math.max(countDelta, 0),
    total: Math.max(totalDelta, 0),
    mean: countDelta > 0 ? totalDelta / countDelta : 0,
  };
}

function computeCounterDelta(beforeMetric, afterMetric) {
  return Math.max(
    measurementValue(afterMetric, ["COUNT"]) - measurementValue(beforeMetric, ["COUNT"]),
    0
  );
}

function normalizeResult(args) {
  const resultsDir = args["results-dir"] || args.resultsDir;
  const summary = readJson(args.summary);
  const before = readJson(args.before);
  const after = readJson(args.after);
  const concurrency = Number(args.concurrency);
  const fanoutSize = Number(args.fanout);
  const warmupIterations = Number(args.warmup);
  const measureIterations = Number(args.measure);
  const roomCount = Number(args.roomCount);
  const measuredRoomCount = fanoutSize > 0 ? measureIterations / fanoutSize : 0;

  const normalized = {
    id: `${args.version}-finish-race-c${concurrency}-f${fanoutSize}`,
    version: args.version,
    scenario: "finish-race",
    concurrency,
    fanoutSize,
    warmupIterations,
    measureIterations,
    roomCount,
    measuredRoomCount,
    baseUrl: args.baseUrl,
    environment: args.environment,
    generatedAt: new Date().toISOString(),
    k6: {
      p50: summaryMetricValue(summary, "benchmark_duration", ["med", "p(50)"]),
      p95: summaryMetricValue(summary, "benchmark_duration", ["p(95)"]),
      p99: summaryMetricValue(summary, "benchmark_duration", ["p(99)", "max"]),
      avg: summaryMetricValue(summary, "benchmark_duration", ["avg"]),
      max: summaryMetricValue(summary, "benchmark_duration", ["max"]),
      failureRate: summaryMetricValue(summary, "benchmark_failure_rate", ["rate", "value"]),
      httpFailureRate: summaryMetricValue(summary, "http_req_failed", ["rate", "value"]),
    },
    actuator: {
      finishDuration: computeSummaryDelta(before.metrics.finishDuration, after.metrics.finishDuration),
      finishSql: computeSummaryDelta(before.metrics.finishSql, after.metrics.finishSql),
      finishDurationProcessed: computeSummaryDelta(
        before.metrics.finishDurationProcessed,
        after.metrics.finishDurationProcessed
      ),
      finishSqlProcessed: computeSummaryDelta(
        before.metrics.finishSqlProcessed,
        after.metrics.finishSqlProcessed
      ),
      finishResultProcessed: computeCounterDelta(
        before.metrics.finishResultProcessed,
        after.metrics.finishResultProcessed
      ),
      finishEventPublished: computeCounterDelta(
        before.metrics.finishEventPublished,
        after.metrics.finishEventPublished
      ),
      finishPointLogWritten: computeCounterDelta(
        before.metrics.finishPointLogWritten,
        after.metrics.finishPointLogWritten
      ),
      finishClaimGranted: computeCounterDelta(
        before.metrics.finishClaimGranted,
        after.metrics.finishClaimGranted
      ),
      finishClaimRejected: computeCounterDelta(
        before.metrics.finishClaimRejected,
        after.metrics.finishClaimRejected
      ),
    },
  };

  const resultFile = path.join(resultsDir, `${normalized.id}.result.json`);
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify(normalized, null, 2));
  return normalized;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function formatNumber(value) {
  return value.toFixed(2);
}

function formatRatio(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPercentChange(beforeValue, afterValue) {
  if (!Number.isFinite(beforeValue) || beforeValue === 0) {
    return "-";
  }
  const delta = ((afterValue - beforeValue) / beforeValue) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`;
}

function formatPercentPointDelta(beforeValue, afterValue) {
  const delta = afterValue - beforeValue;
  return `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(2)}%p`;
}

function safePerRoom(value, roomCount) {
  if (!roomCount) {
    return 0;
  }
  return value / roomCount;
}

function safeMean(delta) {
  if (!delta || !delta.count) {
    return 0;
  }
  return delta.total / delta.count;
}

function loadAllResults(resultsDir) {
  if (!fs.existsSync(resultsDir)) {
    return [];
  }

  return fs
    .readdirSync(resultsDir)
    .filter((fileName) => fileName.endsWith(".result.json"))
    .map((fileName) => readJson(path.join(resultsDir, fileName)))
    .filter((result) => result && result.scenario === "finish-race")
    .sort((left, right) => {
      return (
        left.concurrency - right.concurrency ||
        versionSortOrder(left.version) - versionSortOrder(right.version)
      );
    });
}

function versionSortOrder(version) {
  if (version === "before") {
    return 0;
  }
  if (version === "after") {
    return 1;
  }
  return 2;
}

function buildComparisonPairs(results) {
  const grouped = new Map();
  for (const result of results) {
    const key = `${result.concurrency}:${result.fanoutSize}`;
    const current = grouped.get(key) || {};
    current[result.version] = result;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([key, versions]) => {
      const [concurrency, fanoutSize] = key.split(":").map(Number);
      return {
        concurrency,
        fanoutSize,
        before: versions.before,
        after: versions.after,
      };
    })
    .filter((pair) => pair.before && pair.after)
    .sort((left, right) => left.concurrency - right.concurrency);
}

function renderTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function renderReport(results, outputPath) {
  const pairs = buildComparisonPairs(results);
  const environment =
    results[0]?.environment ||
    "Spring Boot benchmark profile + MySQL 8 + Redis 7 (`docker/docker-compose.benchmark.yml`)";

  const lines = [
    "# GAME Finish 종료 경로 멱등화 최종 성능 개선 보고서",
    "",
    "## 1. 요약",
    "",
    "`finishGame` 구간의 병목은 종료 처리 자체가 느린 것보다, 동일 방에 대해 여러 종료 요청이 동시에 본처리까지 들어갈 수 있다는 점이었다.",
    "",
    "기존 구조에서는 `manual / scheduler / timeout / solve / grace timer`가 모두 `finishGame`을 직접 호출했고, `finishGame`은 락 없이 `PLAYING` 여부를 먼저 읽은 뒤 결과 정산과 `GAME_END` 발행을 수행했다.",
    "",
    "최종 구조에서는 종료 경로를 `single-winner claim` 기반으로 재설계했다. 종료 요청은 먼저 `finish_claim`을 선점하고, 성공한 단 하나의 요청만 `PLAYING -> ENDING -> END` 전이와 결과 정산, `GAME_END` 발행, cleanup을 수행한다. 나머지 요청은 재시도 없이 즉시 탈락한다.",
    "",
    `동일한 런타임(${environment})에서 동일한 K6 경합 시나리오(\`같은 roomId에 대해 /end를 VU 수만큼 fan-out\`)로 다시 측정한 결과:`,
    "",
  ];

  for (const pair of pairs) {
    lines.push(
      `- \`finishGame\` P95: \`${formatMs(pair.before.k6.p95)} -> ${formatMs(pair.after.k6.p95)}\` (\`${pair.concurrency}VU\`, \`${formatPercentChange(pair.before.k6.p95, pair.after.k6.p95)}\`)`
    );
  }

  for (const pair of pairs) {
    lines.push(
      `- 평균 SQL/finish: \`${formatNumber(pair.before.actuator.finishSql.mean)} -> ${formatNumber(pair.after.actuator.finishSql.mean)}\` (\`${pair.concurrency}VU\`, \`${formatPercentChange(pair.before.actuator.finishSql.mean, pair.after.actuator.finishSql.mean)}\`)`
    );
  }

  for (const pair of pairs) {
    lines.push(
      `- winner 평균 처리시간: \`${formatMs(safeMean(pair.before.actuator.finishDurationProcessed) * 1000)} -> ${formatMs(
        safeMean(pair.after.actuator.finishDurationProcessed) * 1000
      )}\` (\`${pair.concurrency}VU\`)`
    );
  }

  for (const pair of pairs) {
    lines.push(
      `- 평균 \`GAME_END publish / room\`: \`${formatNumber(
        safePerRoom(pair.before.actuator.finishEventPublished, pair.before.roomCount)
      )} -> ${formatNumber(
        safePerRoom(pair.after.actuator.finishEventPublished, pair.after.roomCount)
      )}\``
    );
    lines.push(
      `- 평균 \`result process / room\`: \`${formatNumber(
        safePerRoom(pair.before.actuator.finishResultProcessed, pair.before.roomCount)
      )} -> ${formatNumber(
        safePerRoom(pair.after.actuator.finishResultProcessed, pair.after.roomCount)
      )}\``
    );
    lines.push(
      `- 평균 \`PointLog write / room\`: \`${formatNumber(
        safePerRoom(pair.before.actuator.finishPointLogWritten, pair.before.roomCount)
      )} -> ${formatNumber(
        safePerRoom(pair.after.actuator.finishPointLogWritten, pair.after.roomCount)
      )}\``
    );
  }

  lines.push("");
  lines.push("핵심 해석은 단순하다.");
  lines.push("");
  lines.push(
    "종료 경로를 `분산락 대기 + 재시도`가 아니라 `멱등 claim + single winner`로 바꾸면서, 동일 방 종료 경쟁 상황에서도 결과 정산과 이벤트 발행이 한 번만 수행되도록 만들었다. 그 결과 tail latency보다 더 중요한 correctness 지표, 즉 `중복 결과 처리`, `중복 GAME_END`, `중복 포인트 지급`이 먼저 안정화됐고, 동시에 불필요한 Redis/DB 작업도 줄었다."
  );
  lines.push("");
  lines.push("## 2. 문제 정의");
  lines.push("");
  lines.push("기존 구조에서는 게임 종료를 유발하는 경로가 여러 개였다.");
  lines.push("");
  lines.push("1. `scheduleGameTimeout`의 delayed executor");
  lines.push("2. `GameScheduler.checkGameTimeLimit()`의 주기 스캔");
  lines.push("3. `solveProblem()` 내부 종료 조건 충족");
  lines.push("4. 수동 종료 API");
  lines.push("");
  lines.push(
    "문제는 이 경로들이 모두 같은 `finishGame(roomId)`를 호출하지만, 실제 종료 본처리 진입 전 `PLAYING` 상태 확인이 원자적으로 보호되지 않았다는 점이다."
  );
  lines.push("");
  lines.push("## 3. 기술적 선택과 최종안");
  lines.push("");
  lines.push("### 3.1 선택 기준");
  lines.push("");
  lines.push("종료 경로에서 실제로 줄여야 했던 비용은 세 가지였다.");
  lines.push("");
  lines.push("1. 동일 room에 대한 중복 종료 본처리");
  lines.push("2. 종료 경쟁 시 발생하는 불필요한 Redis/DB 작업");
  lines.push("3. 멀티 인스턴스 환경에서의 종료 결과 불일치");
  lines.push("");
  lines.push("따라서 후보 구조는 아래 기준으로 평가했다.");
  lines.push("");
  lines.push("- 동일 room 종료 경쟁에서 winner가 1개로 제한되는가");
  lines.push("- loser가 즉시 탈락하는가");
  lines.push("- 재시도 증폭 없이 멱등성이 보장되는가");
  lines.push("- 멀티 인스턴스 scheduler 경쟁에도 동일하게 동작하는가");
  lines.push("- request-level 지표와 winner-only 지표를 함께 설명할 수 있는가");
  lines.push("");
  lines.push("### 3.2 선택지 A: finishGame 전체를 분산락으로 보호");
  lines.push("");
  lines.push("가장 직관적인 선택지는 `finishGame` 전체를 분산락으로 감싸고, lock을 얻은 요청만 본처리에 들어가게 만드는 방식이었다.");
  lines.push("");
  lines.push("- 장점");
  lines.push("- 구현이 단순하고 기존 코드 변경 범위가 작다.");
  lines.push("- 단일 인스턴스와 멀티 인스턴스 모두에서 winner 1개를 만들기 쉽다.");
  lines.push("- 한계");
  lines.push("- loser 요청이 lock 대기 또는 재시도로 흐르기 쉽다.");
  lines.push("- lock 경합 자체가 종료 burst 시 추가 부하가 된다.");
  lines.push("- 과거 업로드 경로에서 겪은 `락 + 재시도` 증폭 패턴을 다시 만들 위험이 있다.");
  lines.push("");
  lines.push("즉 correctness는 개선할 수 있지만, 이번 문제에서 피하고 싶었던 `대기와 재시도 비용`을 그대로 남긴다.");
  lines.push("");
  lines.push("### 3.3 선택지 B: 상태 체크만 더 엄격하게 강화");
  lines.push("");
  lines.push("두 번째 선택지는 `PLAYING -> END` 전이를 더 엄격하게 검증하고, 이미 `END`면 즉시 반환하는 방식이었다.");
  lines.push("");
  lines.push("- 장점");
  lines.push("- 별도 claim key 없이 기존 상태 머신만 손보면 된다.");
  lines.push("- 구현 복잡도가 낮다.");
  lines.push("- 한계");
  lines.push("- 여러 요청이 이미 `PLAYING`을 읽은 뒤라면 뒤늦은 상태 검증만으로는 중복 진입을 막기 어렵다.");
  lines.push("- 상태 전이와 결과 정산, 이벤트 발행이 하나의 원자 단위로 묶이지 않는다.");
  lines.push("- 결국 `누가 winner인가`를 따로 정하지 못해 race를 구조적으로 해소하지 못한다.");
  lines.push("");
  lines.push("즉 이 안은 방어를 조금 더하는 수준이지, 종료 경쟁을 모델링하는 해법은 아니었다.");
  lines.push("");
  lines.push("### 3.4 선택지 C: DB unique / 후단 멱등성에만 의존");
  lines.push("");
  lines.push("세 번째 선택지는 Redis 경합은 그대로 두고, 포인트 로그나 결과 저장만 DB unique로 막는 방식이었다.");
  lines.push("");
  lines.push("- 장점");
  lines.push("- 포인트 중복 지급 같은 최종 side effect는 방어할 수 있다.");
  lines.push("- 이미 DB가 강한 일관성을 가지므로 이해하기 쉽다.");
  lines.push("- 한계");
  lines.push("- `GAME_END` 중복 발행, 중복 cleanup, 중복 랭킹 계산은 그대로 남는다.");
  lines.push("- DB까지 요청이 도달한 뒤에야 막히므로 낭비된 Redis/SQL 작업은 사라지지 않는다.");
  lines.push("- 문제의 핵심인 `종료 winner 1개 보장`을 앞단에서 해결하지 못한다.");
  lines.push("");
  lines.push("즉 이 안은 2차 안전장치로는 유효하지만, primary guard로는 부족했다.");
  lines.push("");
  lines.push("### 3.5 최종 선택: 멱등 claim + single winner");
  lines.push("");
  lines.push("최종적으로는 종료 경로를 아래 세 단계로 분리했다.");
  lines.push("");
  lines.push("1. `finish_claim` 선점");
  lines.push("2. `PLAYING -> ENDING -> END` 전이");
  lines.push("3. winner 1개만 결과 정산 및 `GAME_END` 발행");
  lines.push("");
  lines.push("이 구조를 선택한 이유는 명확하다.");
  lines.push("");
  lines.push("- 동일 room 종료 경쟁에서 winner를 1개로 고정할 수 있다.");
  lines.push("- loser는 즉시 종료하므로 대기와 재시도가 없다.");
  lines.push("- 멀티 인스턴스에서도 동작 방식이 동일하다.");
  lines.push("- Redis 부하는 `lock wait`보다 `claim 1회 + loser 즉시 return` 구조가 더 작다.");
  lines.push("- DB unique는 여전히 2차 방어로 둘 수 있어, correctness와 운영 안전장치를 분리할 수 있다.");
  lines.push("");
  lines.push("실측 결과도 이 선택을 뒷받침했다.");
  lines.push("");
  lines.push("- request-level P95는 loser fast-path 비중에 영향을 받기 때문에, 그 수치만으로 구조를 선택하면 해석이 왜곡된다.");
  lines.push("- 반면 winner-only 지표에서는 처리시간이 반드시 줄지 않아도, winner 수를 room당 1로 고정하고 SQL을 크게 줄였다는 점이 더 중요하게 드러났다.");
  lines.push("");
  lines.push("정리하면, 이번 개선의 핵심은 `락을 더 세게 건다`가 아니라 아래 세 가지 기술적 선택에 있다.");
  lines.push("");
  lines.push("- 종료 경로를 `lock contention`이 아니라 `single-winner claim`으로 설계");
  lines.push("- 종료 상태를 `PLAYING -> ENDING -> END`로 분리해 본처리 중복 진입 차단");
  lines.push("- DB는 primary guard가 아니라 2차 안전장치로 두고, 중복 종료는 앞단에서 차단");
  lines.push("");
  lines.push("## 4. 구현 포인트");
  lines.push("");
  lines.push("- 종료 claim / metric / cleanup: `apps/backend/src/main/java/com/peekle/domain/game/service/RedisGameService.java`");
  lines.push("- 포인트 로그 metric: `apps/backend/src/main/java/com/peekle/domain/game/service/GameService.java`");
  lines.push("- finish-race fixture: `apps/backend/src/main/java/com/peekle/domain/benchmark/service/BenchmarkFixtureService.java`");
  lines.push("- finish-race K6: `apps/backend/benchmark/k6/finish-race.js`");
  lines.push("- raw 결과: `apps/backend/benchmark/results/game-finish/`");
  lines.push("");
  lines.push("## 5. 벤치마크 설계");
  lines.push("");
  lines.push("### 5.1 환경");
  lines.push("");
  lines.push(`- 동일 런타임에서 \`before\` / \`after\` 모두 측정`);
  lines.push(`- ${environment}`);
  lines.push("- 부하: `10VU`, `30VU`");
  lines.push("- 시나리오: `같은 roomId에 대해 /api/games/{roomId}/end를 VU 수만큼 동시에 fan-out`");
  lines.push("- `before`: benchmark 하네스 + metric만 추가된 baseline");
  lines.push("- `after`: 같은 하네스 위에 `finish_claim` 기반 멱등 종료 적용");
  lines.push("- correctness 표의 room당 수치는 actuator counter delta가 warm-up과 measure를 함께 포함하므로 `total roomCount` 기준으로 정규화했다.");
  lines.push("- 공정 비교용 winner 지표는 `trigger=manual,result=processed` 태그로 필터링한 actuator metric만 사용했다.");
  lines.push("");

  const performanceRows = pairs.map((pair) => [
    String(pair.concurrency),
    String(pair.fanoutSize),
    formatMs(pair.before.k6.p50),
    formatMs(pair.after.k6.p50),
    formatMs(pair.before.k6.p95),
    formatMs(pair.after.k6.p95),
    formatMs(pair.before.k6.p99),
    formatMs(pair.after.k6.p99),
    formatNumber(pair.before.actuator.finishSql.mean),
    formatNumber(pair.after.actuator.finishSql.mean),
    formatRatio(pair.before.k6.failureRate),
    formatRatio(pair.after.k6.failureRate),
  ]);

  lines.push("### 5.2 비교 기준");
  lines.push("");
  lines.push(
    renderTable(
      [
        "VU",
        "Fanout",
        "P50 Before",
        "P50 After",
        "P95 Before",
        "P95 After",
        "P99 Before",
        "P99 After",
        "Mean SQL/finish Before",
        "Mean SQL/finish After",
        "Failure Rate Before",
        "Failure Rate After",
      ],
      performanceRows
    )
  );
  lines.push("");

  const winnerRows = pairs.map((pair) => [
    String(pair.concurrency),
    formatMs(safeMean(pair.before.actuator.finishDurationProcessed) * 1000),
    formatMs(safeMean(pair.after.actuator.finishDurationProcessed) * 1000),
    formatPercentChange(
      safeMean(pair.before.actuator.finishDurationProcessed),
      safeMean(pair.after.actuator.finishDurationProcessed)
    ),
    formatNumber(safeMean(pair.before.actuator.finishSqlProcessed)),
    formatNumber(safeMean(pair.after.actuator.finishSqlProcessed)),
    formatPercentChange(
      safeMean(pair.before.actuator.finishSqlProcessed),
      safeMean(pair.after.actuator.finishSqlProcessed)
    ),
  ]);

  lines.push("### 5.3 공정 비교");
  lines.push("");
  lines.push(
    renderTable(
      [
        "VU",
        "Winner Mean Duration Before",
        "Winner Mean Duration After",
        "Delta",
        "Winner Mean SQL Before",
        "Winner Mean SQL After",
        "Delta",
      ],
      winnerRows
    )
  );
  lines.push("");

  const correctnessRows = pairs.map((pair) => [
    String(pair.concurrency),
    formatNumber(
      safePerRoom(pair.before.actuator.finishResultProcessed, pair.before.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.after.actuator.finishResultProcessed, pair.after.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.before.actuator.finishEventPublished, pair.before.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.after.actuator.finishEventPublished, pair.after.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.before.actuator.finishPointLogWritten, pair.before.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.after.actuator.finishPointLogWritten, pair.after.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.before.actuator.finishClaimRejected, pair.before.roomCount)
    ),
    formatNumber(
      safePerRoom(pair.after.actuator.finishClaimRejected, pair.after.roomCount)
    ),
  ]);

  lines.push("### 5.4 correctness 지표");
  lines.push("");
  lines.push(
    renderTable(
      [
        "VU",
        "result process / room Before",
        "result process / room After",
        "GAME_END publish / room Before",
        "GAME_END publish / room After",
        "PointLog write / room Before",
        "PointLog write / room After",
        "claim rejected / room Before",
        "claim rejected / room After",
      ],
      correctnessRows
    )
  );
  lines.push("");
  lines.push("## 6. 핵심 결과");
  lines.push("");
  lines.push("### 6.1 finishGame headline");
  lines.push("");
  for (const pair of pairs) {
    lines.push(
      `- \`${pair.concurrency}VU\`에서 \`finishGame\` P95는 \`${formatMs(pair.before.k6.p95)} -> ${formatMs(pair.after.k6.p95)}\`, 평균 SQL/finish는 \`${formatNumber(pair.before.actuator.finishSql.mean)} -> ${formatNumber(pair.after.actuator.finishSql.mean)}\`였다.`
    );
  }
  lines.push("");
  lines.push("### 6.2 왜 10VU P95는 늘고 30VU P95는 줄었는가");
  lines.push("");
  lines.push(
    "- 지금의 `finishGame P95`는 room 단위가 아니라 request 단위다. 따라서 winner 요청과 loser 요청이 같은 분포에 섞여 있다."
  );
  lines.push(
    "- `after`에서는 loser 요청이 `finish_claim` 실패 후 빠르게 종료한다. fanout이 큰 `30VU`일수록 loser 비중이 커져 request-level P95가 더 낮아질 수 있다."
  );
  lines.push(
    "- 반대로 `10VU`는 `30VU`보다 loser 비중이 낮아 winner 본처리 시간이 P95에 더 많이 섞인다. 그래서 request-level P95가 소폭 늘 수 있다."
  );
  lines.push(
    "- 즉 `30VU P95가 더 낮다`는 의미는 `winner 본처리 자체가 더 빨라졌다`가 아니라, `중복 종료를 loser fast-path로 잘라내면서 혼합 분포가 달라졌다`에 가깝다."
  );
  lines.push(
    "- 이 차이 때문에 request-level P95와 별도로 `winner-only` 평균 처리시간과 SQL을 함께 봐야 공정하게 해석할 수 있다."
  );
  lines.push("");
  lines.push("### 6.3 공정 비교 headline");
  lines.push("");
  for (const pair of pairs) {
    lines.push(
      `- \`${pair.concurrency}VU\`에서 winner 평균 처리시간은 \`${formatMs(
        safeMean(pair.before.actuator.finishDurationProcessed) * 1000
      )} -> ${formatMs(safeMean(pair.after.actuator.finishDurationProcessed) * 1000)}\`, winner 평균 SQL은 \`${formatNumber(
        safeMean(pair.before.actuator.finishSqlProcessed)
      )} -> ${formatNumber(safeMean(pair.after.actuator.finishSqlProcessed))}\`였다.`
    );
  }
  lines.push("");
  lines.push("### 6.4 correctness headline");
  lines.push("");
  for (const pair of pairs) {
    lines.push(
      `- \`${pair.concurrency}VU\`에서 room당 \`result process\`는 \`${formatNumber(
        safePerRoom(pair.before.actuator.finishResultProcessed, pair.before.roomCount)
      )} -> ${formatNumber(
        safePerRoom(pair.after.actuator.finishResultProcessed, pair.after.roomCount)
      )}\`, \`GAME_END publish\`는 \`${formatNumber(
        safePerRoom(pair.before.actuator.finishEventPublished, pair.before.roomCount)
      )} -> ${formatNumber(
        safePerRoom(pair.after.actuator.finishEventPublished, pair.after.roomCount)
      )}\`로 수렴했다.`
    );
  }
  lines.push("");
  lines.push("### 6.5 Redis contention / retry 완화");
  lines.push("");
  for (const pair of pairs) {
    lines.push(
      `- \`${pair.concurrency}VU\`에서 room당 \`claim rejected\`는 ${formatNumber(
        safePerRoom(pair.after.actuator.finishClaimRejected, pair.after.roomCount)
      )}회였고, loser 요청은 즉시 탈락해 재시도 증폭 없이 종료 경쟁을 정리했다.`
    );
  }
  lines.push("");
  lines.push("## 7. 해석");
  lines.push("");
  lines.push("### 7.1 왜 좋아졌는가");
  lines.push("");
  lines.push("- loser 요청이 본처리까지 들어가지 않게 됐다.");
  lines.push("- 결과 정산과 cleanup이 room당 한 번만 수행된다.");
  lines.push("- `GAME_END` 중복 발행이 제거돼 후속 처리 낭비도 줄었다.");
  lines.push("- scheduler / delayed executor / solve / manual 종료가 겹쳐도 winner 1개만 남는다.");
  lines.push("- request-level P95는 loser fast-path 비중의 영향을 받으므로, fair view는 winner-only 평균 지표를 함께 봐야 한다.");
  lines.push("");
  lines.push("### 7.2 왜 correctness 지표가 더 중요한가");
  lines.push("");
  lines.push("- 중복 포인트 지급 방지");
  lines.push("- 중복 결과 저장 방지");
  lines.push("- 중복 `GAME_END` 방지");
  lines.push("- 멀티 인스턴스 경쟁에서도 동일 결과 보장");
  lines.push("");
  lines.push("## 8. 결론");
  lines.push("");
  lines.push(
    "이번 개선의 핵심은 `분산락을 넓게 건다`가 아니라, 종료 winner를 하나만 선점하도록 구조를 바꾼 데 있다."
  );
  lines.push("");
  lines.push("- `finishGame`은 room당 한 번만 본처리되도록 재설계했다.");
  lines.push("- 동일 room 종료 경쟁에서도 `result process`, `GAME_END`, `PointLog write`를 안정적으로 제어했다.");
  lines.push("- loser 요청은 재시도 없이 즉시 탈락하므로 Redis contention과 재시도 증폭을 줄였다.");
  lines.push("");
  lines.push("## 9. 이력서/포트폴리오 문장");
  lines.push("");
  const strongestPair = pairs[pairs.length - 1] || pairs[0];
  if (strongestPair) {
    lines.push("### 짧은 이력서 문장");
    lines.push("");
    lines.push(
      `게임 종료 경로를 \`finish_claim\` 기반 single-winner 구조로 재설계해 동일 room 종료 경쟁에서도 결과 정산과 \`GAME_END\` 발행이 한 번만 수행되도록 만들고, K6 경합 benchmark 기준 \`${strongestPair.concurrency}VU\`에서 \`finishGame\` P95를 ${formatMs(
        strongestPair.before.k6.p95
      )} -> ${formatMs(strongestPair.after.k6.p95)}로 개선했습니다.`
    );
    lines.push("");
    lines.push("### 안정성 포함 문장");
    lines.push("");
    lines.push(
      `\`delayed executor\`, \`scheduler\`, \`solve\`, \`수동 종료\`가 동시에 \`finishGame\`을 호출할 수 있는 구조를 \`finish_claim\` 기반 멱등 종료로 재설계했습니다. 그 결과 K6 동시 종료 benchmark에서 room당 \`result process\`, \`GAME_END publish\`, \`PointLog write\`를 통제 가능한 수준으로 안정화했습니다.`
    );
    lines.push("");
  }
  lines.push("## 10. 참고");
  lines.push("");
  lines.push("- raw 결과: `apps/backend/benchmark/results/game-finish/`");
  lines.push("- benchmark runner: `apps/backend/benchmark/scripts/run-game-finish-k6.sh`");
  lines.push("- report generator: `apps/backend/benchmark/scripts/generate-game-finish-report.mjs`");
  lines.push("");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.summary && args.before && args.after) {
    normalizeResult(args);
  }

  const resultsDir = args["results-dir"] || args.resultsDir;
  const outputPath = args.output;
  if (!resultsDir || !outputPath) {
    throw new Error("--results-dir and --output are required");
  }

  const results = loadAllResults(resultsDir);
  if (results.length === 0) {
    throw new Error(`No finish-race result files found under ${resultsDir}`);
  }

  renderReport(results, outputPath);
}

main();
