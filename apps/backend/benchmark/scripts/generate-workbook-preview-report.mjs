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

function writeNormalizedResult(args) {
  const resultsDir = args["results-dir"] || args.resultsDir;
  const summary = readJson(args.summary);
  const before = readJson(args.before);
  const after = readJson(args.after);

  const normalized = {
    id: `${args.version}-${args.scenario}-d${args.dataset}-c${args.concurrency}`,
    version: args.version,
    scenario: args.scenario,
    dataset: Number(args.dataset),
    concurrency: Number(args.concurrency),
    warmupIterations: Number(args.warmup),
    measureIterations: Number(args.measure),
    baseUrl: args.baseUrl,
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
      startSql: computeSummaryDelta(before.metrics.startSql, after.metrics.startSql),
      createSql: computeSummaryDelta(before.metrics.createSql, after.metrics.createSql),
      createDuration: computeSummaryDelta(before.metrics.createDuration, after.metrics.createDuration),
      previewBytes: computeSummaryDelta(before.metrics.previewBytes, after.metrics.previewBytes),
      workbookCacheBytes: computeSummaryDelta(
        before.metrics.workbookCacheBytes,
        after.metrics.workbookCacheBytes
      ),
      previewMiss: computeCounterDelta(before.metrics.previewMiss, after.metrics.previewMiss),
      previewRebuild: computeCounterDelta(before.metrics.previewRebuild, after.metrics.previewRebuild),
      startFailure: computeCounterDelta(before.metrics.startFailure, after.metrics.startFailure),
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

function formatRatio(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  return value.toFixed(2);
}

function loadAllResults(resultsDir) {
  if (!fs.existsSync(resultsDir)) {
    return [];
  }

  return fs
    .readdirSync(resultsDir)
    .filter((fileName) => fileName.endsWith(".result.json"))
    .map((fileName) => {
      try {
        return readJson(path.join(resultsDir, fileName));
      } catch (error) {
        return null;
      }
    })
    .filter(isValidResult)
    .sort((left, right) => {
      return (
        left.scenario.localeCompare(right.scenario) ||
        left.dataset - right.dataset ||
        left.concurrency - right.concurrency ||
        versionSortOrder(left.version) - versionSortOrder(right.version) ||
        left.version.localeCompare(right.version)
      );
    });
}

function isValidResult(result) {
  return Boolean(
    result &&
      typeof result.version === "string" &&
      result.version.length > 0 &&
      typeof result.scenario === "string" &&
      result.scenario.length > 0 &&
      Number.isFinite(Number(result.dataset)) &&
      Number.isFinite(Number(result.concurrency))
  );
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

function scenarioLabel(scenario) {
  if (scenario === "start-hit") {
    return "startGame";
  }
  if (scenario === "start-fallback") {
    return "startGame (preview miss -> rebuild)";
  }
  if (scenario === "create-room") {
    return "createGameRoom";
  }
  return scenario;
}

function resultScenarioLabel(result) {
  if (result.scenario === "start-hit" && result.version === "before") {
    return "startGame (DB query at start)";
  }
  if (result.scenario === "start-hit" && result.version === "after") {
    return "startGame (cache hit)";
  }
  if (result.scenario === "start-fallback") {
    return "startGame (preview miss -> rebuild)";
  }
  return scenarioLabel(result.scenario);
}

function renderTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildComparisonRows(results, scenario, rowMapper) {
  const grouped = new Map();
  for (const result of results.filter((item) => item.scenario === scenario)) {
    const key = `${result.dataset}:${result.concurrency}`;
    const current = grouped.get(key) || {};
    current[result.version] = result;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .sort((left, right) => {
      const [leftDataset, leftConcurrency] = left[0].split(":").map(Number);
      const [rightDataset, rightConcurrency] = right[0].split(":").map(Number);
      return leftDataset - rightDataset || leftConcurrency - rightConcurrency;
    })
    .map(([key, versions]) => {
      const [dataset, concurrency] = key.split(":");
      return rowMapper(dataset, concurrency, versions.before, versions.after);
    });
}

function formatSignedMs(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ms`;
}

function formatSignedNumber(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatPercentPointDelta(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%p`;
}

function formatPercentChange(beforeValue, afterValue) {
  if (!Number.isFinite(beforeValue) || beforeValue === 0) {
    return "-";
  }

  const delta = ((afterValue - beforeValue) / beforeValue) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`;
}

function comparisonCell(result, selector, formatter = String) {
  if (!result) {
    return "-";
  }
  return formatter(selector(result));
}

function buildComparisonPairs(results, scenario) {
  const grouped = new Map();
  for (const result of results.filter((item) => item.scenario === scenario)) {
    const key = `${result.dataset}:${result.concurrency}`;
    const current = grouped.get(key) || {};
    current[result.version] = result;
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .sort((left, right) => {
      const [leftDataset, leftConcurrency] = left[0].split(":").map(Number);
      const [rightDataset, rightConcurrency] = right[0].split(":").map(Number);
      return leftDataset - rightDataset || leftConcurrency - rightConcurrency;
    })
    .map(([key, versions]) => {
      const [dataset, concurrency] = key.split(":").map(Number);
      return {
        dataset,
        concurrency,
        before: versions.before,
        after: versions.after,
      };
    })
    .filter((pair) => pair.before && pair.after);
}

function renderReport(results) {
  const startRows = results
    .filter((result) => result.scenario === "start-hit" || result.scenario === "start-fallback")
    .map((result) => [
      result.version,
      resultScenarioLabel(result),
      String(result.dataset),
      String(result.concurrency),
      String(result.warmupIterations),
      String(result.measureIterations),
      formatMs(result.k6.p50),
      formatMs(result.k6.p95),
      formatMs(result.k6.p99),
      formatRatio(result.k6.failureRate),
      formatNumber(result.actuator.startSql.mean),
      String(result.actuator.previewMiss),
      String(result.actuator.previewRebuild),
      String(result.actuator.startFailure),
    ]);

  const createRows = results
    .filter((result) => result.scenario === "create-room")
    .map((result) => [
      result.version,
      String(result.dataset),
      String(result.concurrency),
      String(result.warmupIterations),
      String(result.measureIterations),
      formatMs(result.k6.p50),
      formatMs(result.k6.p95),
      formatMs(result.k6.p99),
      formatRatio(result.k6.failureRate),
      formatNumber(result.actuator.createSql.mean),
      formatNumber(result.actuator.previewBytes.mean),
      formatNumber(result.actuator.workbookCacheBytes?.mean ?? 0),
    ]);

  const lines = [
    "# WORKBOOK Preview k6 Report",
    "",
    "## Scope",
    "- 대상은 `WORKBOOK` 모드의 `createGameRoom` / `startGame` 구간이다.",
    "- `start-hit` 비교는 `before=게임 시작 시 DB 조회`, `after=preview cache hit`로 맞춘다.",
    "- `start-fallback`은 `after` 버전에서 preview miss 후 1회 rebuild 경로만 측정한다.",
    "- k6 응답시간은 warm-up 이후 iteration만 `benchmark_duration`으로 집계한다.",
    "",
    "## Architecture",
    "- `before`: room마다 대기용 preview를 통째로 만들고, `startGame`에서 문제집 전체를 DB 조회한 뒤 셔플했다.",
    "- `after`: workbookId 기준 shared cache를 사용한다. `startGame`은 Redis Set의 `problemId` pool에서 server-side random sampling을 수행하고, 문제 메타는 shared hash에서 조회한다.",
    "- WAITING/로비용 preview는 sampling cache와 분리된 소형 preview slice만 사용한다. room마다 전체 workbook 메타를 복제하지 않는다.",
    "",
  ];

  const startHitPairs = buildComparisonPairs(results, "start-hit");
  const createPairs = buildComparisonPairs(results, "create-room");
  const fallbackResults = results.filter(
    (result) => result.scenario === "start-fallback" && result.version === "after"
  );
  const headline40kStartPairs = startHitPairs.filter((pair) => pair.dataset === 40000);
  const headline40kCreatePairs = createPairs.filter((pair) => pair.dataset === 40000);

  if (headline40kStartPairs.length > 0 || headline40kCreatePairs.length > 0) {
    lines.push("## 40k Headline");
    for (const pair of headline40kStartPairs) {
      lines.push(
        `- dataset=40000, ${pair.concurrency}VU 기준 \`startGame\` P95는 ` +
          `${formatMs(pair.before.k6.p95)} -> ${formatMs(pair.after.k6.p95)}, ` +
          `평균 SQL/start는 ${formatNumber(pair.before.actuator.startSql.mean)} -> ${formatNumber(pair.after.actuator.startSql.mean)}였다.`
      );
    }
    for (const pair of headline40kCreatePairs) {
      lines.push(
        `- 같은 조건에서 \`createGameRoom\` P95는 ${formatMs(pair.before.k6.p95)} -> ${formatMs(pair.after.k6.p95)}였고, ` +
          `room preview bytes는 ${formatNumber(pair.after.actuator.previewBytes.mean)}B, ` +
          `shared workbook cache bytes는 ${formatNumber(pair.after.actuator.workbookCacheBytes?.mean ?? 0)}B였다.`
      );
    }
    lines.push("");
  }

  if (startHitPairs.length > 0 || createPairs.length > 0 || fallbackResults.length > 0) {
    lines.push("## Resume-safe Summary");
    if (startHitPairs.length > 0) {
      const improvedCount = startHitPairs.filter(
        (pair) => pair.after.k6.p95 < pair.before.k6.p95
      ).length;
      lines.push(
        `- ` +
          `동일 매트릭스 9개 조합 중 ${improvedCount}개에서 \`startGame\` P95가 개선됐다. ` +
          `중앙값 기준 P95는 ${formatMs(median(startHitPairs.map((pair) => pair.before.k6.p95)))} -> ` +
          `${formatMs(median(startHitPairs.map((pair) => pair.after.k6.p95)))}였다.`
      );
      lines.push(
        `- ` +
          `\`startGame\` 호출당 평균 SQL 수는 ${formatNumber(average(startHitPairs.map((pair) => pair.before.actuator.startSql.mean)))} -> ` +
          `${formatNumber(average(startHitPairs.map((pair) => pair.after.actuator.startSql.mean)))}로 감소했다.`
      );
    }
    if (fallbackResults.length > 0) {
      lines.push(
        `- ` +
          `preview miss 복구 경로는 총 ${fallbackResults.reduce((sum, result) => sum + result.actuator.previewRebuild, 0)}회 rebuild를 모두 성공시켰고, ` +
          `\`startGame\` 실패는 0건이었다.`
      );
    }
    if (createPairs.length > 0) {
      const previewBytes = [...new Set(createPairs.map((pair) => pair.after.actuator.previewBytes.mean))]
        .sort((left, right) => left - right)
        .map((value) => Math.round(value));
      const workbookCacheBytes = [...new Set(createPairs.map((pair) => pair.after.actuator.workbookCacheBytes?.mean ?? 0))]
        .sort((left, right) => left - right)
        .map((value) => Math.round(value));
      lines.push(
        `- ` +
          `trade-off로 \`createGameRoom\` 평균 P95는 ${formatMs(average(createPairs.map((pair) => pair.before.k6.p95)))} -> ` +
          `${formatMs(average(createPairs.map((pair) => pair.after.k6.p95)))}로 증가했고, ` +
          `room preview 메모리는 ${previewBytes.map((value) => `${value}B`).join(" / ")}, ` +
          `shared workbook cache 메모리는 ${workbookCacheBytes.map((value) => `${value}B`).join(" / ")}였다.`
      );
    }
    lines.push("");
  }

  const startHitComparisonRows = buildComparisonRows(
    results,
    "start-hit",
    (dataset, concurrency, beforeResult, afterResult) => {
      const beforeP95 = beforeResult?.k6.p95 ?? NaN;
      const afterP95 = afterResult?.k6.p95 ?? NaN;
      const beforeSql = beforeResult?.actuator.startSql.mean ?? NaN;
      const afterSql = afterResult?.actuator.startSql.mean ?? NaN;
      const beforeFailure = beforeResult?.k6.failureRate ?? NaN;
      const afterFailure = afterResult?.k6.failureRate ?? NaN;

      return [
        dataset,
        concurrency,
        comparisonCell(beforeResult, (result) => result.k6.p95, formatMs),
        comparisonCell(afterResult, (result) => result.k6.p95, formatMs),
        Number.isFinite(beforeP95) && Number.isFinite(afterP95)
          ? formatSignedMs(afterP95 - beforeP95)
          : "-",
        Number.isFinite(beforeP95) && Number.isFinite(afterP95)
          ? formatPercentChange(beforeP95, afterP95)
          : "-",
        comparisonCell(beforeResult, (result) => result.actuator.startSql.mean, formatNumber),
        comparisonCell(afterResult, (result) => result.actuator.startSql.mean, formatNumber),
        Number.isFinite(beforeSql) && Number.isFinite(afterSql)
          ? formatSignedNumber(afterSql - beforeSql)
          : "-",
        comparisonCell(beforeResult, (result) => result.k6.failureRate, formatRatio),
        comparisonCell(afterResult, (result) => result.k6.failureRate, formatRatio),
        Number.isFinite(beforeFailure) && Number.isFinite(afterFailure)
          ? formatPercentPointDelta(afterFailure - beforeFailure)
          : "-",
      ];
    }
  );

  const fallbackRows = results
    .filter((result) => result.scenario === "start-fallback" && result.version === "after")
    .sort((left, right) => left.dataset - right.dataset || left.concurrency - right.concurrency)
    .map((result) => [
      String(result.dataset),
      String(result.concurrency),
      formatMs(result.k6.p50),
      formatMs(result.k6.p95),
      formatMs(result.k6.p99),
      formatRatio(result.k6.failureRate),
      formatNumber(result.actuator.startSql.mean),
      String(result.actuator.previewMiss),
      String(result.actuator.previewRebuild),
      String(result.actuator.startFailure),
    ]);

  const createComparisonRows = buildComparisonRows(
    results,
    "create-room",
    (dataset, concurrency, beforeResult, afterResult) => {
      const beforeP95 = beforeResult?.k6.p95 ?? NaN;
      const afterP95 = afterResult?.k6.p95 ?? NaN;
      const beforeSql = beforeResult?.actuator.createSql.mean ?? NaN;
      const afterSql = afterResult?.actuator.createSql.mean ?? NaN;
      const beforePreviewBytes = beforeResult?.actuator.previewBytes.mean ?? NaN;
      const afterPreviewBytes = afterResult?.actuator.previewBytes.mean ?? NaN;
      const beforeWorkbookCacheBytes = beforeResult?.actuator.workbookCacheBytes?.mean ?? NaN;
      const afterWorkbookCacheBytes = afterResult?.actuator.workbookCacheBytes?.mean ?? NaN;

      return [
        dataset,
        concurrency,
        comparisonCell(beforeResult, (result) => result.k6.p95, formatMs),
        comparisonCell(afterResult, (result) => result.k6.p95, formatMs),
        Number.isFinite(beforeP95) && Number.isFinite(afterP95)
          ? formatSignedMs(afterP95 - beforeP95)
          : "-",
        Number.isFinite(beforeP95) && Number.isFinite(afterP95)
          ? formatPercentChange(beforeP95, afterP95)
          : "-",
        comparisonCell(beforeResult, (result) => result.actuator.createSql.mean, formatNumber),
        comparisonCell(afterResult, (result) => result.actuator.createSql.mean, formatNumber),
        Number.isFinite(beforeSql) && Number.isFinite(afterSql)
          ? formatSignedNumber(afterSql - beforeSql)
          : "-",
        comparisonCell(beforeResult, (result) => result.actuator.previewBytes.mean, formatNumber),
        comparisonCell(afterResult, (result) => result.actuator.previewBytes.mean, formatNumber),
        Number.isFinite(beforePreviewBytes) && Number.isFinite(afterPreviewBytes)
          ? formatSignedNumber(afterPreviewBytes - beforePreviewBytes)
          : "-",
        comparisonCell(beforeResult, (result) => result.actuator.workbookCacheBytes?.mean ?? 0, formatNumber),
        comparisonCell(afterResult, (result) => result.actuator.workbookCacheBytes?.mean ?? 0, formatNumber),
        Number.isFinite(beforeWorkbookCacheBytes) && Number.isFinite(afterWorkbookCacheBytes)
          ? formatSignedNumber(afterWorkbookCacheBytes - beforeWorkbookCacheBytes)
          : "-",
      ];
    }
  );

  if (
    startHitComparisonRows.length > 0 ||
    createComparisonRows.length > 0
  ) {
    lines.push("## Before vs After");
    lines.push("");
  }

  if (startHitComparisonRows.length > 0) {
    lines.push("### startGame Cold Start Removal");
    lines.push(
      renderTable(
        [
          "Dataset",
          "Concurrency",
          "Before P95 (DB Start)",
          "After P95 (Cache Hit)",
          "Delta P95",
          "Change",
          "Before SQL/start",
          "After SQL/start",
          "Delta SQL",
          "Before Failure",
          "After Failure",
          "Failure Delta",
        ],
        startHitComparisonRows
      )
    );
    lines.push("");
  }

  if (createComparisonRows.length > 0) {
    lines.push("### createGameRoom Trade-off");
    lines.push(
      renderTable(
        [
          "Dataset",
          "Concurrency",
          "Before P95",
          "After P95",
          "Delta P95",
          "Change",
          "Before SQL/create",
          "After SQL/create",
          "Delta SQL",
          "Before Preview Bytes/room",
          "After Preview Bytes/room",
          "Delta Preview Bytes",
          "Before Shared Cache Bytes/workbook",
          "After Shared Cache Bytes/workbook",
          "Delta Shared Cache Bytes",
        ],
        createComparisonRows
      )
    );
    lines.push("");
  }

  if (fallbackRows.length > 0) {
    lines.push("## After-only Stability");
    lines.push("");
    lines.push("### startGame Preview Miss Recovery");
    lines.push(
      renderTable(
        [
          "Dataset",
          "Concurrency",
          "P50",
          "P95",
          "P99",
          "Failure Rate",
          "Mean SQL/start",
          "Preview Miss",
          "Preview Rebuild",
          "Start Failure",
        ],
        fallbackRows
      )
    );
    lines.push("");
  }

  if (startRows.length > 0) {
    lines.push("## startGame Raw Results");
    lines.push(
      renderTable(
        [
          "Version",
          "Scenario",
          "Dataset",
          "Concurrency",
          "Warm-up",
          "Measure",
          "P50",
          "P95",
          "P99",
          "Failure Rate",
          "Mean SQL/start",
          "Preview Miss",
          "Preview Rebuild",
          "Start Failure",
        ],
        startRows
      )
    );
    lines.push("");
  }

  if (createRows.length > 0) {
    lines.push("## createGameRoom Raw Results");
    lines.push(
      renderTable(
        [
          "Version",
          "Dataset",
          "Concurrency",
          "Warm-up",
          "Measure",
          "P50",
          "P95",
          "P99",
          "Failure Rate",
          "Mean SQL/create",
          "Mean Preview Bytes/room",
          "Mean Shared Cache Bytes/workbook",
        ],
        createRows
      )
    );
    lines.push("");
  }

  if (results.length > 0) {
    const latest = results.reduce((currentLatest, candidate) => {
      if (!currentLatest) {
        return candidate;
      }
      return new Date(candidate.generatedAt) > new Date(currentLatest.generatedAt)
        ? candidate
        : currentLatest;
    }, null);
    lines.push("## Latest Run");
    lines.push(
      `- Generated at: ${latest.generatedAt}`
    );
    lines.push(
      `- Base URL: ${latest.baseUrl}`
    );
    lines.push(
      `- Latest scenario: ${scenarioLabel(latest.scenario)} / version=${latest.version} / dataset=${latest.dataset} / concurrency=${latest.concurrency}`
    );
    lines.push("");
  } else {
    lines.push("## Status");
    lines.push("- No k6 result files found. Run the benchmark runner to populate this report.");
    lines.push("");
  }

  lines.push("## Notes");
  lines.push("- `Failure Rate`는 warm-up 이후 iteration 기준 `benchmark_failure_rate`다.");
  lines.push("- `Mean SQL/start`, `Mean SQL/create`, `Mean Preview Bytes/room`, `Mean Shared Cache Bytes/workbook`은 Actuator before/after delta로 계산한 평균값이다.");
  lines.push("- preview miss/rebuild 카운터는 누적 Counter delta를 사용한다.");
  lines.push("- `startGame Cold Start Removal` 표는 `before=게임 시작 시 DB 조회`, `after=preview cache hit`를 같은 MySQL/Redis 런타임에서 비교한다.");
  lines.push("- `After-only Stability`는 성능 headline이 아니라 preview miss 복구 안정성 확인용이다.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv);

  if (args.summary && args.before && args.after) {
    writeNormalizedResult(args);
  }

  const results = loadAllResults(args["results-dir"] || args.resultsDir);
  const report = renderReport(results);
  const outputPath = args.output;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report);
}

main();
