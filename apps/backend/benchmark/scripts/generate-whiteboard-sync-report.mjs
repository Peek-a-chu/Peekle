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

function parseLogFields(line) {
  const marker = "[WB_BENCH]";
  const markerIndex = line.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const tail = line.slice(markerIndex + marker.length);
  const fields = {};
  const regex = /([A-Za-z][A-Za-z0-9-]*)=([^\s]+)/g;
  let match;
  while ((match = regex.exec(tail))) {
    fields[match[1]] = match[2];
  }

  if (!fields.event) {
    return null;
  }
  return fields;
}

function parseLogTimestamp(line) {
  const token = line.trim().split(/\s+/, 1)[0];
  const timestamp = Date.parse(token);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function summarizeValues(values) {
  if (!values.length) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      p50: 0,
      p95: 0,
      max: 0,
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (ratio) => {
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(sorted.length * ratio) - 1)
    );
    return sorted[index];
  };

  return {
    count: sorted.length,
    avg: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    min: sorted[0],
    p50: percentile(0.5),
    p95: percentile(0.95),
    max: sorted[sorted.length - 1],
  };
}

function summarizeServerLog(filePath) {
  const empty = {
    totalBenchEvents: 0,
    counts: {},
    maxHistoryCount: 0,
    maxRevision: 0,
    eventProcessingLatencyMs: summarizeValues([]),
    syncResponseLatencyMs: summarizeValues([]),
  };

  if (!filePath || !fs.existsSync(filePath)) {
    return empty;
  }

  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const counts = {};
  let totalBenchEvents = 0;
  let maxHistoryCount = 0;
  let maxRevision = 0;
  const eventProcessingValues = [];
  const syncResponseValues = [];
  const pendingSyncRequests = new Map();

  for (const line of lines) {
    const fields = parseLogFields(line);
    if (!fields) {
      continue;
    }

    totalBenchEvents += 1;
    counts[fields.event] = (counts[fields.event] || 0) + 1;

    const historyCount = Number(fields.historyCount || 0);
    if (Number.isFinite(historyCount)) {
      maxHistoryCount = Math.max(maxHistoryCount, historyCount);
    }

    const revision = Number(fields.revision || 0);
    if (Number.isFinite(revision)) {
      maxRevision = Math.max(maxRevision, revision);
    }

    const timestamp = parseLogTimestamp(line);
    const key = `${fields.studyId || "-"}:${fields.userId || "-"}`;

    if (fields.event === "request" && fields.action === "SYNC") {
      const queue = pendingSyncRequests.get(key) || [];
      queue.push(timestamp);
      pendingSyncRequests.set(key, queue);
    }

    if (fields.event === "sync-response" && timestamp !== null) {
      const queue = pendingSyncRequests.get(key) || [];
      const startedAt = queue.shift();
      if (queue.length > 0) {
        pendingSyncRequests.set(key, queue);
      } else {
        pendingSyncRequests.delete(key);
      }

      if (startedAt != null) {
        syncResponseValues.push(Math.max(0, timestamp - startedAt));
      }
    }

    if (fields.event === "draw-broadcast" && timestamp !== null) {
      const clientSentAt = Number(fields.clientSentAt || 0);
      if (Number.isFinite(clientSentAt) && clientSentAt > 0) {
        eventProcessingValues.push(Math.max(0, timestamp - clientSentAt));
      }
    }
  }

  return {
    totalBenchEvents,
    counts,
    maxHistoryCount,
    maxRevision,
    eventProcessingLatencyMs: summarizeValues(eventProcessingValues),
    syncResponseLatencyMs: summarizeValues(syncResponseValues),
  };
}

function normalizeResult(args) {
  const summary = readJson(args.summary);
  const playwright = readJson(args.playwright);
  const serverLog = summarizeServerLog(args["server-log"] || args.serverLog);
  const resultsDir = args["results-dir"] || args.resultsDir;

  const normalized = {
    id: args.runId,
    version: args.version,
    generatedAt: new Date().toISOString(),
    environment: args.environment,
    config: {
      baseUrl: args.baseUrl,
      frontendBaseUrl: args.frontendBaseUrl,
      syncMode: args.syncMode || "default",
      vus: Number(args.vus),
      warmupIterations: Number(args.warmup),
      measureIterations: Number(args.measure),
      seedHistorySize: Number(args.seedHistorySize),
      eventsPerSession: Number(args.eventsPerSession),
      playwrightSamples: Number(args.playwrightSamples),
      newEventsDuringDisconnect: Number(args.newEventsDuringDisconnect),
    },
    k6: {
      benchmarkDuration: {
        avg: summaryMetricValue(summary, "benchmark_duration", ["avg"]),
        p50: summaryMetricValue(summary, "benchmark_duration", ["med", "p(50)"]),
        p95: summaryMetricValue(summary, "benchmark_duration", ["p(95)"]),
        max: summaryMetricValue(summary, "benchmark_duration", ["max"]),
      },
      eventRtt: serverLog.eventProcessingLatencyMs,
      syncRtt: serverLog.syncResponseLatencyMs,
      failureRates: {
        benchmark: summaryMetricValue(summary, "benchmark_failure_rate", ["rate", "value"]),
        connect: summaryMetricValue(
          summary,
          "whiteboard_connect_failure_rate",
          ["rate", "value"]
        ),
        event: summaryMetricValue(
          summary,
          "whiteboard_event_failure_rate",
          ["rate", "value"]
        ),
        consistency: summaryMetricValue(
          summary,
          "whiteboard_consistency_failure_rate",
          ["rate", "value"]
        ),
      },
    },
    playwright: {
      reconnectRestoreMs: playwright.reconnectRestoreMs,
      consistencyFailureRate: Number(playwright.consistencyFailureRate || 0),
      successfulSamples: Number(playwright.successfulSamples || 0),
      failedSamples: Number(playwright.failedSamples || 0),
    },
    serverLog,
    paths: {
      summary: path.resolve(args.summary),
      playwright: path.resolve(args.playwright),
      serverLog: path.resolve(args["server-log"] || args.serverLog),
    },
  };

  const resultFile = path.join(resultsDir, `${normalized.id}.result.json`);
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(resultFile, JSON.stringify(normalized, null, 2));
  return normalized;
}

function listResults(resultsDir) {
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    return [];
  }

  return fs
    .readdirSync(resultsDir)
    .filter((entry) => entry.endsWith(".result.json"))
    .map((entry) => readJson(path.join(resultsDir, entry)))
    .sort((left, right) => String(left.generatedAt).localeCompare(String(right.generatedAt)));
}

function comparisonPair(results) {
  const byVersion = new Map(results.map((result) => [result.version, result]));
  if (byVersion.has("before") && byVersion.has("after")) {
    return {
      before: byVersion.get("before"),
      after: byVersion.get("after"),
    };
  }

  if (results.length < 2) {
    return null;
  }

  return {
    before: results[results.length - 2],
    after: results[results.length - 1],
  };
}

function formatMs(value) {
  return `${Number(value || 0).toFixed(2)} ms`;
}

function formatRatio(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatCount(value) {
  return `${Math.round(Number(value || 0))}`;
}

function formatDelta(beforeValue, afterValue) {
  const before = Number(beforeValue || 0);
  const after = Number(afterValue || 0);
  if (!Number.isFinite(before) || before === 0) {
    return "-";
  }
  const delta = ((after - before) / before) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`;
}

function formatReconnect(result, field) {
  if ((result.playwright.reconnectRestoreMs?.count || 0) === 0) {
    return "FAIL";
  }
  return formatMs(result.playwright.reconnectRestoreMs?.[field]);
}

function renderResultsTable(results) {
  const header = [
    "| Version | Reconnect p50 | Reconnect p95 | Event RTT p50 | Event RTT p95 | Playwright consistency fail | k6 consistency fail | Event fail | Connect fail |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  const rows = results.map((result) => {
    return `| ${result.version} | ${formatReconnect(
      result,
      "p50"
    )} | ${formatReconnect(result, "p95")} | ${formatMs(
      result.k6.eventRtt.p50
    )} | ${formatMs(result.k6.eventRtt.p95)} | ${formatRatio(
      result.playwright.consistencyFailureRate
    )} | ${formatRatio(result.k6.failureRates.consistency)} | ${formatRatio(
      result.k6.failureRates.event
    )} | ${formatRatio(result.k6.failureRates.connect)} |`;
  });

  return [...header, ...rows].join("\n");
}

function renderServerTable(results) {
  const header = [
    "| Version | Bench events | Sync responses | Draw broadcasts | Sync latency p95 | Event latency p95 | Errors | Cleanup scheduled | Cleanup executed | Cleanup aborted | Max history | Max revision |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  const rows = results.map((result) => {
    const counts = result.serverLog.counts || {};
    return `| ${result.version} | ${formatCount(
      result.serverLog.totalBenchEvents
    )} | ${formatCount(counts["sync-response"])} | ${formatCount(
      counts["draw-broadcast"]
    )} | ${formatMs(result.serverLog.syncResponseLatencyMs.p95)} | ${formatMs(
      result.serverLog.eventProcessingLatencyMs.p95
    )} | ${formatCount(counts.error)} | ${formatCount(
      counts["cleanup-scheduled"]
    )} | ${formatCount(counts["cleanup-executed"])} | ${formatCount(
      counts["cleanup-aborted"]
    )} | ${formatCount(result.serverLog.maxHistoryCount)} | ${formatCount(
      result.serverLog.maxRevision
    )} |`;
  });

  return [...header, ...rows].join("\n");
}

function renderComparison(pair) {
  if (!pair) {
    return "";
  }

  const { before, after } = pair;
  const lines = [
    "## Delta",
    "",
    `비교 대상: \`${before.version}\` -> \`${after.version}\``,
    "",
    "| Metric | Before | After | Change |",
    "| --- | ---: | ---: | ---: |",
    `| Reconnect restore p95 | ${formatReconnect(before, "p95")} | ${formatReconnect(
      after,
      "p95"
    )} | ${
      before.playwright.reconnectRestoreMs.count > 0
        ? formatDelta(
            before.playwright.reconnectRestoreMs.p95,
            after.playwright.reconnectRestoreMs.p95
          )
        : "n/a"
    } |`,
    `| Event processing p95 | ${formatMs(before.k6.eventRtt.p95)} | ${formatMs(
      after.k6.eventRtt.p95
    )} | ${formatDelta(before.k6.eventRtt.p95, after.k6.eventRtt.p95)} |`,
    `| Playwright consistency fail | ${formatRatio(
      before.playwright.consistencyFailureRate
    )} | ${formatRatio(after.playwright.consistencyFailureRate)} | ${formatDelta(
      before.playwright.consistencyFailureRate,
      after.playwright.consistencyFailureRate
    )} |`,
    `| k6 consistency fail | ${formatRatio(
      before.k6.failureRates.consistency
    )} | ${formatRatio(after.k6.failureRates.consistency)} | ${formatDelta(
      before.k6.failureRates.consistency,
      after.k6.failureRates.consistency
    )} |`,
    `| Server log errors | ${formatCount(
      before.serverLog.counts?.error
    )} | ${formatCount(after.serverLog.counts?.error)} | ${formatDelta(
      before.serverLog.counts?.error,
      after.serverLog.counts?.error
    )} |`,
  ];

  return lines.join("\n");
}

function renderArtifacts(results) {
  const lines = ["## Artifacts", ""];
  for (const result of results) {
    lines.push(`### ${result.version}`);
    lines.push("");
    lines.push(`- k6 summary: \`${result.paths.summary}\``);
    lines.push(`- Playwright result: \`${result.paths.playwright}\``);
    lines.push(`- Server log: \`${result.paths.serverLog}\``);
    lines.push("");
  }
  return lines.join("\n");
}

function buildReport(results, pair) {
  const latest = results[results.length - 1];
  const config = latest?.config || {};
  return [
    "# Whiteboard 동기화 Benchmark 보고서",
    "",
    `생성 시각: ${new Date().toISOString()}`,
    "",
    "## 측정 구성",
    "",
    `- 환경: ${latest?.environment || "-"}`,
    `- Backend base URL: \`${config.baseUrl || "-"}\``,
    `- Frontend base URL: \`${config.frontendBaseUrl || "-"}\``,
    `- k6: \`${config.vus || 0} VUs\`, warm-up \`${config.warmupIterations || 0}\`, measure \`${config.measureIterations || 0}\`, session당 \`${config.eventsPerSession || 0}\` events`,
    `- Playwright: \`${config.playwrightSamples || 0}\` samples, 초기 history \`${config.seedHistorySize || 0}\`, disconnect 중 추가 이벤트 \`${config.newEventsDuringDisconnect || 0}\``,
    "",
    "## 결과 요약",
    "",
    renderResultsTable(results),
    "",
    "## 서버 로그 요약",
    "",
    renderServerTable(results),
    "",
    renderComparison(pair),
    "",
    "## 해석 기준",
    "",
    "- 재접속 복원 완료 시간: Playwright가 viewer 페이지를 다시 연 뒤 expected object count와 expected revision(legacy는 object count) 에 도달할 때까지의 시간",
    "- 실시간 이벤트 처리 지연: k6가 발생시킨 이벤트의 `clientSentAt`부터 서버 `draw-broadcast` 로그 시각까지의 지연",
    "- SYNC 응답 지연: k6가 발생시킨 SYNC 요청 로그부터 서버 `sync-response` 로그 시각까지의 지연",
    "- 정합성 실패율: Playwright는 owner/viewer semantic object hash mismatch 비율, k6는 HTTP benchmark 요청 실패 비율",
    "",
    renderArtifacts(results),
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const resultsDir = args["results-dir"] || args.resultsDir;
  const normalized = normalizeResult(args);
  const results = listResults(resultsDir);
  const pair = comparisonPair(results);
  const markdown = buildReport(results, pair);
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, markdown);
  process.stdout.write(`${args.output}\n`);
  return normalized;
}

main();
