import fs from "node:fs";
import path from "node:path";

const SCENARIO_ORDER = [
  "http-io",
  "http-cpu",
  "http-ws-io",
  "http-ws-cpu",
];

const COLLECTOR_ORDER = ["g1", "g1-tuned", "zgc", "zgc-tuned"];

const SCENARIO_META = {
  "http-io": {
    label: "HTTP I/O Bound",
    journey:
      "benchmark fixture가 대기방을 준비한 뒤, host가 `start-hit` 경로로 게임 시작을 호출한다. workbook preview cache hit 경로의 HTTP 응답성과 collector 영향을 본다.",
  },
  "http-cpu": {
    label: "HTTP CPU Bound",
    journey:
      "측정 직전에 preview cache를 eviction한 뒤, host가 `start-fallback` 경로로 게임 시작을 호출한다. preview rebuild와 metadata 로딩이 동반되는 allocation-heavy HTTP 경로를 본다.",
  },
  "http-ws-io": {
    label: "HTTP + WS I/O Bound",
    journey:
      "위 `HTTP I/O Bound` 시작 플로우 동안 같은 room 참가자들이 `/pub/games/chat`으로 chat을 보내고 `/topic/games/{roomId}/chat/global`을 구독한다. 정상 hit 경로 위에 WS chat fanout이 겹친 상태를 본다.",
  },
  "http-ws-cpu": {
    label: "HTTP + WS CPU Bound",
    journey:
      "위 `HTTP CPU Bound` fallback 시작 플로우 동안 같은 room에서 동일한 WS chat traffic을 유지한다. allocation-heavy HTTP 경로와 WS 부하가 동시에 존재할 때 collector 차이를 본다.",
  },
};

const COLLECTOR_LABEL = {
  g1: "G1",
  "g1-tuned": "G1 Tuned",
  zgc: "ZGC",
  "zgc-tuned": "ZGC Tuned",
};

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

function computeCounterDelta(beforeMetric, afterMetric, statisticNames = ["COUNT", "TOTAL"]) {
  return Math.max(
    measurementValue(afterMetric, statisticNames) -
      measurementValue(beforeMetric, statisticNames),
    0
  );
}

function parseDockerValue(rawValue) {
  if (!rawValue) {
    return 0;
  }

  const normalized = rawValue.trim();
  const match = normalized.match(/^([\d.]+)\s*([A-Za-z]+)?$/);
  if (!match) {
    return 0;
  }

  const value = Number(match[1]);
  const unit = (match[2] || "").toUpperCase();
  const factors = {
    B: 1,
    KB: 1000,
    MB: 1000 ** 2,
    GB: 1000 ** 3,
    TB: 1000 ** 4,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
  };

  if (!Number.isFinite(value)) {
    return 0;
  }
  return value * (factors[unit] || 1);
}

function parseDockerPercent(rawValue) {
  if (!rawValue) {
    return 0;
  }
  return Number(String(rawValue).replace("%", "").trim()) || 0;
}

function summarizeDockerStats(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      samples: 0,
      avgCpuPercent: 0,
      maxCpuPercent: 0,
      maxMemBytes: 0,
      memLimitBytes: 0,
    };
  }

  const samples = fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);

  if (samples.length === 0) {
    return {
      samples: 0,
      avgCpuPercent: 0,
      maxCpuPercent: 0,
      maxMemBytes: 0,
      memLimitBytes: 0,
    };
  }

  const cpuValues = samples.map((sample) => parseDockerPercent(sample.CPUPerc));
  const memPairs = samples.map((sample) =>
    String(sample.MemUsage || "")
      .split("/")
      .map((value) => parseDockerValue(value))
  );

  return {
    samples: samples.length,
    avgCpuPercent:
      cpuValues.reduce((sum, value) => sum + value, 0) / Math.max(cpuValues.length, 1),
    maxCpuPercent: Math.max(...cpuValues, 0),
    maxMemBytes: Math.max(...memPairs.map((pair) => pair[0] || 0), 0),
    memLimitBytes: Math.max(...memPairs.map((pair) => pair[1] || 0), 0),
  };
}

function summarizeSafepoints(filePath) {
  const empty = {
    count: 0,
    totalTimeSeconds: 0,
    maxSeconds: 0,
    avgSeconds: 0,
  };

  if (!filePath || !fs.existsSync(filePath)) {
    return empty;
  }

  let count = 0;
  let totalNs = 0;
  let maxNs = 0;

  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/\[safepoint\s*\].*Total:\s+(\d+)\s+ns/);
    if (!match) {
      continue;
    }

    const valueNs = Number(match[1]);
    if (!Number.isFinite(valueNs)) {
      continue;
    }

    count += 1;
    totalNs += valueNs;
    maxNs = Math.max(maxNs, valueNs);
  }

  return {
    count,
    totalTimeSeconds: totalNs / 1_000_000_000,
    maxSeconds: maxNs / 1_000_000_000,
    avgSeconds: count > 0 ? totalNs / count / 1_000_000_000 : 0,
  };
}

function normalizedActuator(before, after) {
  return {
    gcPause: {
      count: computeCounterDelta(before.metrics.gcPause, after.metrics.gcPause, ["COUNT"]),
      totalTimeSeconds: computeCounterDelta(
        before.metrics.gcPause,
        after.metrics.gcPause,
        ["TOTAL_TIME", "TOTAL"]
      ),
      maxSeconds: measurementValue(after.metrics.gcPause, ["MAX"]),
    },
    gcOverhead: {
      value: measurementValue(after.metrics.gcOverhead, ["VALUE"]),
    },
    gcAllocatedBytes: computeCounterDelta(
      before.metrics.gcAllocated,
      after.metrics.gcAllocated,
      ["COUNT", "TOTAL", "VALUE"]
    ),
    gcPromotedBytes: computeCounterDelta(
      before.metrics.gcPromoted,
      after.metrics.gcPromoted,
      ["COUNT", "TOTAL", "VALUE"]
    ),
    gcLiveDataBytes: measurementValue(after.metrics.gcLiveDataSize, ["VALUE"]),
    memoryUsedBytes: measurementValue(after.metrics.jvmMemoryUsed, ["VALUE"]),
    processCpuUsage: measurementValue(after.metrics.processCpuUsage, ["VALUE"]),
    threadsLive: measurementValue(after.metrics.jvmThreadsLive, ["VALUE"]),
    systemCpuCount: measurementValue(after.metrics.systemCpuCount, ["VALUE"]),
  };
}

function writeNormalizedResult(args) {
  if (!args.summary || !args.before || !args.after) {
    return null;
  }

  if (
    !fs.existsSync(args.summary) ||
    !fs.existsSync(args.before) ||
    !fs.existsSync(args.after)
  ) {
    return null;
  }

  const resultsDir = args["results-dir"] || args.resultsDir;
  const gcLogPath = args["gc-log"] || args.gcLog || null;
  const summary = readJson(args.summary);
  const before = readJson(args.before);
  const after = readJson(args.after);
  const docker = summarizeDockerStats(args["docker-stats"] || args.dockerStats);
  const stw = summarizeSafepoints(gcLogPath);

  const normalized = {
    id: `${args.collector}-${args.scenario}-c${args.concurrency}`,
    collector: args.collector,
    scenario: args.scenario,
    concurrency: Number(args.concurrency),
    warmupIterations: Number(args.warmup),
    measureIterations: Number(args.measure),
    baseUrl: args.baseUrl,
    environment: args.environment,
    generatedAt: new Date().toISOString(),
    k6: {
      http: {
        p50: summaryMetricValue(summary, "benchmark_duration", ["med", "p(50)"]),
        p95: summaryMetricValue(summary, "benchmark_duration", ["p(95)"]),
        p99: summaryMetricValue(summary, "benchmark_duration", ["p(99)", "max"]),
        avg: summaryMetricValue(summary, "benchmark_duration", ["avg"]),
        max: summaryMetricValue(summary, "benchmark_duration", ["max"]),
        failureRate: summaryMetricValue(summary, "benchmark_failure_rate", ["rate", "value"]),
        httpFailureRate: summaryMetricValue(summary, "http_req_failed", ["rate", "value"]),
      },
      ws: {
        p50: summaryMetricValue(summary, "ws_chat_rtt", ["med", "p(50)"]),
        p95: summaryMetricValue(summary, "ws_chat_rtt", ["p(95)"]),
        p99: summaryMetricValue(summary, "ws_chat_rtt", ["p(99)", "max"]),
        avg: summaryMetricValue(summary, "ws_chat_rtt", ["avg"]),
        max: summaryMetricValue(summary, "ws_chat_rtt", ["max"]),
        failureRate: summaryMetricValue(summary, "ws_chat_failure_rate", ["rate", "value"]),
        connectFailureRate: summaryMetricValue(
          summary,
          "ws_connect_failure_rate",
          ["rate", "value"]
        ),
      },
    },
    actuator: normalizedActuator(before, after),
    stw,
    docker,
    artifacts: {
      summary: args.summary,
      before: args.before,
      after: args.after,
      dockerStats: args["docker-stats"] || args.dockerStats || null,
      gcLog: gcLogPath,
    },
  };

  const resultFile = path.join(resultsDir, `${normalized.id}.result.json`);
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify(normalized, null, 2));
  return normalized;
}

function loadAllResults(resultsDir) {
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    return [];
  }

  return fs
    .readdirSync(resultsDir)
    .filter((fileName) => fileName.endsWith(".result.json"))
    .map((fileName) => {
      try {
        const result = readJson(path.join(resultsDir, fileName));
        return {
          ...result,
          stw: summarizeSafepoints(result.artifacts?.gcLog),
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      return (
        SCENARIO_ORDER.indexOf(left.scenario) - SCENARIO_ORDER.indexOf(right.scenario) ||
        left.concurrency - right.concurrency ||
        COLLECTOR_ORDER.indexOf(left.collector) - COLLECTOR_ORDER.indexOf(right.collector)
      );
    });
}

function formatMs(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} ms` : "-";
}

function formatRatio(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "-";
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "-";
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "-";
}

function formatCount(value) {
  return Number.isFinite(value) ? String(Math.round(value)) : "-";
}

function formatSeconds(value) {
  return Number.isFinite(value) ? `${value.toFixed(4)} s` : "-";
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let unitIndex = 0;
  let current = value;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(2)} ${units[unitIndex]}`;
}

function formatDeltaPercent(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return "n/a";
  }
  return `${(((to - from) / from) * 100).toFixed(2)}%`;
}

function renderTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function collectorLabel(collector) {
  return COLLECTOR_LABEL[collector] || collector;
}

function collectorSlashLabel(collectors) {
  return collectors.map((collector) => collectorLabel(collector)).join("/");
}

function resultByCollector(results, scenario, concurrency) {
  const map = {};
  for (const result of results) {
    if (result.scenario === scenario && result.concurrency === concurrency) {
      map[result.collector] = result;
    }
  }
  return map;
}

function collectorsPresent(results) {
  return COLLECTOR_ORDER.filter((collector) =>
    results.some((result) => result.collector === collector)
  );
}

function allConcurrencies(results) {
  return [...new Set(results.map((result) => result.concurrency))].sort((left, right) => left - right);
}

function scenariosPresent(results) {
  return SCENARIO_ORDER.filter((scenario) =>
    results.some((result) => result.scenario === scenario)
  );
}

function completeCellCount(results, collectorList) {
  const count = new Map();
  for (const result of results) {
    const key = `${result.scenario}:${result.concurrency}`;
    const current = count.get(key) || new Set();
    current.add(result.collector);
    count.set(key, current);
  }
  return [...count.values()].filter((set) =>
    collectorList.every((collector) => set.has(collector))
  ).length;
}

function totalExpectedRunCount(results, collectorList) {
  const scenarios = scenariosPresent(results);
  const concurrencies = allConcurrencies(results);
  return Math.max(scenarios.length, 1) * Math.max(concurrencies.length, 1) * collectorList.length;
}

function buildSummaryBullets(results, collectorList) {
  const bullets = [];

  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      const candidates = collectorList
        .map((collector) => ({
          collector,
          result: collectors[collector],
        }))
        .filter((item) => Number.isFinite(item.result?.k6?.http?.p95));

      if (candidates.length < 2) {
        continue;
      }

      const p95Values = candidates
        .map((item) => `${collectorLabel(item.collector)} ${formatMs(item.result.k6.http.p95)}`)
        .join(" / ");
      const deltas = [];
      for (let index = 1; index < candidates.length; index += 1) {
        const previous = candidates[index - 1];
        const current = candidates[index];
        deltas.push(
          `\`${collectorLabel(previous.collector)} -> ${collectorLabel(current.collector)}\`는 \`${formatDeltaPercent(
            previous.result.k6.http.p95,
            current.result.k6.http.p95
          )}\``
        );
      }
      bullets.push(
        `- \`${SCENARIO_META[scenario].label}\` \`${concurrency}VU\`에서 HTTP P95는 \`${p95Values}\`였고, ${deltas.join(", ")}였다.`
      );
    }
  }

  return bullets;
}

function buildLatencyRows(results, collectorList) {
  const rows = [];
  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      rows.push([
        SCENARIO_META[scenario].label,
        String(concurrency),
        ...collectorList.map((collector) =>
          formatMs(collectors[collector]?.k6.http.p95 ?? NaN)
        ),
      ]);
    }
  }
  return rows;
}

function buildGcRows(results, collectorList) {
  const rows = [];
  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      const joined = (selector, formatter) =>
        collectorList.map((collector) =>
          formatter(selector(collectors[collector]))
        ).join(" / ");

      rows.push([
        SCENARIO_META[scenario].label,
        String(concurrency),
        joined((result) => result?.actuator.gcPause.count ?? NaN, formatNumber),
        joined((result) => result?.actuator.gcPause.totalTimeSeconds ?? NaN, formatSeconds),
        joined((result) => result?.actuator.gcPause.maxSeconds ?? NaN, formatSeconds),
        joined((result) => result?.actuator.gcAllocatedBytes ?? NaN, formatBytes),
        joined((result) => result?.actuator.gcPromotedBytes ?? NaN, formatBytes),
        joined((result) => result?.actuator.gcLiveDataBytes ?? NaN, formatBytes),
      ]);
    }
  }
  return rows;
}

function buildProcessRows(results, collectorList) {
  const rows = [];
  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      const joined = (selector, formatter) =>
        collectorList.map((collector) =>
          formatter(selector(collectors[collector]))
        ).join(" / ");

      rows.push([
        SCENARIO_META[scenario].label,
        String(concurrency),
        joined((result) => (result?.actuator.processCpuUsage ?? NaN) * 100, formatPercent),
        joined((result) => result?.docker.maxCpuPercent ?? NaN, formatPercent),
        joined((result) => result?.docker.maxMemBytes ?? NaN, formatBytes),
        joined((result) => result?.actuator.memoryUsedBytes ?? NaN, formatBytes),
        joined((result) => result?.actuator.threadsLive ?? NaN, formatNumber),
        joined((result) => result?.k6.http.failureRate ?? NaN, formatRatio),
        joined((result) => result?.k6.ws.p95 ?? NaN, formatMs),
      ]);
    }
  }
  return rows;
}

function buildStwRows(results, collectorList) {
  const rows = [];
  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      const joined = (selector, formatter) =>
        collectorList.map((collector) =>
          formatter(selector(collectors[collector]))
        ).join(" / ");

      rows.push([
        SCENARIO_META[scenario].label,
        String(concurrency),
        joined((result) => result?.stw.count ?? NaN, formatCount),
        joined((result) => result?.stw.totalTimeSeconds ?? NaN, formatSeconds),
        joined((result) => result?.stw.maxSeconds ?? NaN, formatSeconds),
        joined((result) => result?.stw.avgSeconds ?? NaN, formatSeconds),
      ]);
    }
  }
  return rows;
}

function specForCollector(collector, specs) {
  if (collector === "g1") {
    return specs.g1Spec;
  }
  if (collector === "g1-tuned") {
    return specs.g1TunedSpec;
  }
  if (collector === "zgc") {
    return specs.zgcSpec;
  }
  if (collector === "zgc-tuned") {
    return specs.zgcTunedSpec.includes("UseZGC")
      ? specs.zgcTunedSpec
      : `${specs.zgcSpec} ${specs.zgcTunedSpec}`;
  }
  return "";
}

function buildInterpretationBullets(results, specs, collectorList) {
  const bullets = [
    "- 모든 collector는 collector/tuning 플래그 외 공통 JVM 스펙을 동일하게 두고 비교했다.",
    "- mixed 시나리오는 HTTP를 primary axis로 두고, WS는 두 시나리오 모두 동일한 `game chat` 부하로 유지했다.",
    "- STW 지표는 `actuator`의 `jvm.gc.pause`와 별도로 `gc.log`의 `safepoint` 합계/최대/평균을 집계해 함께 봤다.",
  ];

  const wins = new Map(collectorList.map((collector) => [collector, 0]));

  for (const scenario of SCENARIO_ORDER) {
    for (const concurrency of allConcurrencies(results)) {
      const collectors = resultByCollector(results, scenario, concurrency);
      const candidates = collectorList
        .map((collector) => ({
          collector,
          p95: collectors[collector]?.k6.http.p95,
        }))
        .filter((item) => Number.isFinite(item.p95));

      if (candidates.length === 0) {
        continue;
      }

      candidates.sort((left, right) => left.p95 - right.p95);
      const winner = candidates[0].collector;
      wins.set(winner, (wins.get(winner) || 0) + 1);
    }
  }

  const winnerText = collectorList
    .map((collector) => `${collectorLabel(collector)}=${wins.get(collector) || 0}`)
    .join(", ");
  bullets.push(
    `- 현재 수집 결과 기준 HTTP P95 winner count는 \`${winnerText}\`다.`
  );

  return bullets;
}

function buildConclusion(results, collectorList) {
  const totalExpected = totalExpectedRunCount(results, collectorList);
  const completed = completeCellCount(results, collectorList);
  if (results.length < totalExpected) {
    return [
      `현재 결과는 \`${results.length}/${totalExpected}\` run만 수집된 부분 매트릭스다.`,
      `현재 collector가 모두 채워진 scenario/VU cell은 \`${completed}\`개다.`,
      "나머지 run이 채워지면 같은 형식으로 결론을 다시 갱신한다.",
    ];
  }

  return [
    "세 collector는 동일한 heap/CPU/JVM 공통 옵션 위에서 비교했다.",
    "최종 평가는 각 시나리오의 HTTP P95, WS RTT, GC pause, 메모리 사용량을 함께 보고 내린다.",
    "특정 collector 하나를 절대 승자로 선언하기보다, I/O 중심과 allocation-heavy 경로에서 어떤 collector가 더 안정적인지 시나리오별로 구분해 해석한다.",
  ];
}

function renderReport(results, environment, resultsDirLabel, specs) {
  const collectorList = collectorsPresent(results);
  const metricCollectors = collectorList.length > 0 ? collectorList : COLLECTOR_ORDER;
  const collectors = collectorList
    .map((collector) => `\`${collectorLabel(collector)}\``)
    .join(", ");
  const metricCollectorLabel = collectorSlashLabel(metricCollectors);
  const scenarioList = scenariosPresent(results);
  const scenarioMatrixLabel = scenarioList.length > 0 ? scenarioList.join(",") : "4개";
  const vusListLabel = allConcurrencies(results).length > 0 ? allConcurrencies(results).join(",") : "10,30";
  const lines = [
    "# JVM GC k6 비교 보고서",
    "",
    "## 1. 요약",
    "",
    `동일한 런타임(${environment})에서 ${collectors || "`G1`, `ZGC`, `ZGC Tuned`"}를 같은 benchmark fixture, 같은 room 수, 같은 dataset, 같은 warm-up/measure 규칙으로 비교했다.`,
    "",
  ];

  const summaryBullets = buildSummaryBullets(results, metricCollectors);
  if (summaryBullets.length === 0) {
    if (results.length === 0) {
      lines.push("- 아직 수집된 결과가 없어 요약 수치가 없다.");
    } else {
      lines.push(
        `- 현재는 부분 결과 상태이며, \`${results.length}/${totalExpectedRunCount(results, metricCollectors)}\` run만 수집됐다. collector가 모두 채워진 scenario/VU cell이 생기면 pairwise delta 요약을 자동으로 채운다.`
      );
    }
  } else {
    lines.push(...summaryBullets);
  }

  lines.push(
    "",
    "## 2. 문제 정의",
    "",
    "이번 비교의 목적은 collector를 바꿀 때 실제 사용자 여정 기준 HTTP/WS latency, GC pause, 메모리 사용량이 어떻게 달라지는지 같은 스펙 위에서 확인하는 것이다.",
    "",
    `- 비교 collector: ${collectors || "`G1`, `G1 Tuned`, `ZGC`, `ZGC Tuned`"}`,
    "- 최종 판단: 같은 표에서 HTTP/WS latency, GC pause, 메모리 사용량을 함께 비교",
    "",
    "## 3. 비교군 정의와 선택 기준",
    "",
    `- 공통 스펙: \`${specs.commonSpec}\``,
    ...metricCollectors.map(
      (collector) => `- \`${collectorLabel(collector)}\`: \`${specForCollector(collector, specs)}\``
    ),
    "",
    "## 4. 사용자 여정",
    ""
  );

  for (const scenario of SCENARIO_ORDER) {
    lines.push(`### 4.${SCENARIO_ORDER.indexOf(scenario) + 1} ${SCENARIO_META[scenario].label}`);
    lines.push("", `- ${SCENARIO_META[scenario].journey}`, "");
  }

  lines.push(
    "## 5. 구현 포인트",
    "",
    "- compose 리소스 제한과 `BENCHMARK_JAVA_OPTS` 주입: `docker/docker-compose.benchmark.yml`",
    "- benchmark fixture에 `hostUserId`, `guestUserId` 추가: `BenchmarkFixtureService`",
    "- collector별 k6 시나리오와 WS helper: `apps/backend/benchmark/k6/`",
    "- matrix runner와 3-way report generator: `apps/backend/benchmark/scripts/`",
    "",
    "## 6. 벤치마크 설계",
    "",
    `- 환경: ${environment}`,
    `- matrix: \`collector={${metricCollectors.join(",")}} x scenario={${scenarioMatrixLabel}} x vus={${vusListLabel}}\``,
    "- 각 run 전: backend recreate, readiness 확인, metrics token 발급, actuator baseline snapshot 저장",
    "- 각 run 중: k6 latency/failure, WS chat RTT, docker stats 1초 샘플",
    "- 각 run 후: actuator end snapshot, `/tmp/gc.log` 복사, report에서 `safepoint` STW 집계",
    "",
    "## 7. 핵심 결과",
    ""
  );

  if (results.length === 0) {
    lines.push("- No result files found. Run the GC matrix runner to populate this report.");
  } else {
    lines.push("### 7.1 Latency", "");
    lines.push(
      renderTable(
        ["시나리오", "VU", ...metricCollectors.map((collector) => `${collectorLabel(collector)} P95`)],
        buildLatencyRows(results, metricCollectors)
      )
    );
    lines.push("", "### 7.2 GC", "");
    lines.push(
      renderTable(
        [
          "시나리오",
          "VU",
          `Pause Count (${metricCollectorLabel})`,
          `Total Pause (${metricCollectorLabel})`,
          `Max Pause (${metricCollectorLabel})`,
          `Allocated (${metricCollectorLabel})`,
          `Promoted (${metricCollectorLabel})`,
          `Live Data (${metricCollectorLabel})`,
        ],
        buildGcRows(results, metricCollectors)
      )
    );
    lines.push("", "### 7.3 STW / Safepoint", "");
    lines.push(
      renderTable(
        [
          "시나리오",
          "VU",
          `STW Count (${metricCollectorLabel})`,
          `STW Total (${metricCollectorLabel})`,
          `STW Max (${metricCollectorLabel})`,
          `STW Avg (${metricCollectorLabel})`,
        ],
        buildStwRows(results, metricCollectors)
      )
    );
    lines.push("", "### 7.4 Process", "");
    lines.push(
      renderTable(
        [
          "시나리오",
          "VU",
          `Process CPU (${metricCollectorLabel})`,
          `Max CPU (${metricCollectorLabel})`,
          `Max RSS (${metricCollectorLabel})`,
          `JVM Used (${metricCollectorLabel})`,
          `Live Threads (${metricCollectorLabel})`,
          `Failure Rate (${metricCollectorLabel})`,
          `WS RTT P95 (${metricCollectorLabel})`,
        ],
        buildProcessRows(results, metricCollectors)
      )
    );
  }

  lines.push("", "## 8. 해석", "");
  lines.push(...buildInterpretationBullets(results, specs, metricCollectors));
  lines.push("", "## 9. 결론", "");
  lines.push(...buildConclusion(results, metricCollectors));
  lines.push(
    "",
    "## 10. 참고",
    "",
    `- raw 결과: \`${resultsDirLabel}\``,
    "- benchmark runner: `apps/backend/benchmark/scripts/run-gc-k6-matrix.sh`",
    "- report generator: `apps/backend/benchmark/scripts/generate-gc-k6-report.mjs`"
  );

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const resultsDir = args["results-dir"] || args.resultsDir;
  const reportPath = args.output;
  const environment =
    args.environment ||
    "Spring Boot benchmark profile + MySQL 8 + Redis 7 (`docker/docker-compose.benchmark.yml`, total 2vCPU / 8GB)";
  const specs = {
    commonSpec:
      args["common-spec"] ||
      args.commonSpec ||
      "-Xms4g -Xmx4g -XX:ActiveProcessorCount=2 -XX:+UseStringDeduplication -Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime,level,tags",
	    g1Spec: args["g1-spec"] || args.g1Spec || "-XX:+UseG1GC",
	    g1TunedSpec:
	      args["g1-tuned-spec"] ||
	      args.g1TunedSpec ||
	      "-XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1ReservePercent=15",
	    zgcSpec: args["zgc-spec"] || args.zgcSpec || "-XX:+UseZGC -XX:+ZGenerational",
    zgcTunedSpec:
      args["zgc-tuned-spec"] ||
      args.zgcTunedSpec ||
      "-XX:SoftMaxHeapSize=3584m",
  };

  writeNormalizedResult(args);
  const results = loadAllResults(resultsDir);
  const resultsDirLabel = args["results-dir"] || args.resultsDir || "apps/backend/benchmark/results/gc-matrix";
  const report = renderReport(results, environment, resultsDirLabel, specs);

  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
  } else {
    process.stdout.write(report);
  }
}

main();
