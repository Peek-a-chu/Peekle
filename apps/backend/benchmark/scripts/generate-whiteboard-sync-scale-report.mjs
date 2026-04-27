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

function formatMs(value) {
  return `${Number(value || 0).toFixed(2)} ms`;
}

function formatRatio(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatReconnect(result, field) {
  const count = Number(result.playwright?.reconnectRestoreMs?.count || 0);
  if (count <= 0) {
    return "FAIL";
  }
  return formatMs(result.playwright?.reconnectRestoreMs?.[field]);
}

function stageStatus(result) {
  const benchmarkFail = Number(result.k6?.failureRates?.benchmark || 0);
  const connectFail = Number(result.k6?.failureRates?.connect || 0);
  const eventFail = Number(result.k6?.failureRates?.event || 0);
  const consistencyFail = Number(result.playwright?.consistencyFailureRate || 0);
  const eventSamples = Number(result.k6?.eventRtt?.count || 0);
  const successfulSamples = Number(result.playwright?.successfulSamples || 0);
  const expectedSamples = Number(result.config?.playwrightSamples || 0);

  if (benchmarkFail > 0 || connectFail > 0 || eventFail > 0) {
    return "FAIL";
  }
  if (consistencyFail > 0) {
    return "FAIL";
  }
  if (eventSamples <= 0) {
    return "FAIL";
  }
  if (expectedSamples > 0 && successfulSamples < expectedSamples) {
    return "FAIL";
  }
  return "PASS";
}

function stageNotes(result) {
  const notes = [];
  const benchmarkFail = Number(result.k6?.failureRates?.benchmark || 0);
  const connectFail = Number(result.k6?.failureRates?.connect || 0);
  const eventFail = Number(result.k6?.failureRates?.event || 0);
  const consistencyFail = Number(result.playwright?.consistencyFailureRate || 0);
  const successfulSamples = Number(result.playwright?.successfulSamples || 0);
  const expectedSamples = Number(result.config?.playwrightSamples || 0);

  if (benchmarkFail > 0) {
    notes.push(`k6 benchmark fail ${formatRatio(benchmarkFail)}`);
  }
  if (connectFail > 0) {
    notes.push(`connect fail ${formatRatio(connectFail)}`);
  }
  if (eventFail > 0) {
    notes.push(`event fail ${formatRatio(eventFail)}`);
  }
  if (consistencyFail > 0) {
    notes.push(`Playwright consistency fail ${formatRatio(consistencyFail)}`);
  }
  if (expectedSamples > 0 && successfulSamples < expectedSamples) {
    notes.push(`reconnect success ${successfulSamples}/${expectedSamples}`);
  }
  if (result.failure?.reason) {
    notes.push(result.failure.reason);
  }
  if (!notes.length) {
    notes.push("all thresholds passed");
  }
  return notes.join(", ");
}

function loadScaleResults(resultsDir) {
  if (!resultsDir || !fs.existsSync(resultsDir)) {
    return [];
  }

  return fs
    .readdirSync(resultsDir)
    .filter((entry) => entry.endsWith(".result.json"))
    .map((entry) => readJson(path.join(resultsDir, entry)))
    .sort((left, right) => Number(left.config?.vus || 0) - Number(right.config?.vus || 0));
}

function renderSummary(results) {
  const firstFail = results.find((result) => stageStatus(result) === "FAIL");
  const lastPass = [...results].reverse().find((result) => stageStatus(result) === "PASS");
  const lines = [];

  if (lastPass) {
    lines.push(
      `- 마지막 통과 구간: \`${Number(lastPass.config?.vus || 0).toLocaleString()}명\``
    );
  } else {
    lines.push("- 마지막 통과 구간: 없음");
  }

  if (firstFail) {
    lines.push(
      `- 첫 실패 구간: \`${Number(firstFail.config?.vus || 0).toLocaleString()}명\``
    );
    lines.push(`- 실패 이유: ${stageNotes(firstFail)}`);
  } else {
    lines.push("- 첫 실패 구간: 관측되지 않음");
  }

  return lines;
}

function renderTable(results) {
  const lines = [
    "| Users | Reconnect p50 | Reconnect p95 | Event RTT p95 | Sync RTT p95 | Playwright consistency fail | k6 benchmark fail | Status | Notes |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
  ];

  for (const result of results) {
    lines.push(
      `| ${Number(result.config?.vus || 0).toLocaleString()} | ${formatReconnect(result, "p50")} | ${formatReconnect(result, "p95")} | ${formatMs(result.k6?.eventRtt?.p95)} | ${formatMs(result.k6?.syncRtt?.p95)} | ${formatRatio(result.playwright?.consistencyFailureRate)} | ${formatRatio(result.k6?.failureRates?.benchmark)} | ${stageStatus(result)} | ${stageNotes(result)} |`
    );
  }

  return lines;
}

function renderArtifacts(results, resultsDir) {
  const lines = [];
  for (const result of results) {
    lines.push(`### ${Number(result.config?.vus || 0).toLocaleString()}명`);
    lines.push("");
    lines.push(`- Result JSON: \`${path.join(resultsDir, `${result.id}.result.json`)}\``);
    lines.push(`- k6 summary: \`${result.paths?.summary || ""}\``);
    lines.push(`- Playwright result: \`${result.paths?.playwright || ""}\``);
    lines.push(`- Server log: \`${result.paths?.serverLog || ""}\``);
    lines.push("");
  }
  return lines;
}

function main() {
  const args = parseArgs(process.argv);
  const resultsDir = path.resolve(args["results-dir"] || args.resultsDir);
  const outputPath = path.resolve(args.output);
  const results = loadScaleResults(resultsDir);

  const lines = [
    "# Whiteboard 동기화 Scale Benchmark 보고서",
    `생성 시각: ${new Date().toISOString()}`,
    "## 측정 구성",
    `- 환경: ${args.environment}`,
    `- Backend base URL: \`${args.baseUrl}\``,
    `- Frontend base URL: \`${args.frontendBaseUrl}\``,
    `- 사용자 스윕: \`${Number(args.startUsers).toLocaleString()}명\`부터 \`${Number(args.maxUsers).toLocaleString()}명\`까지, \`${Number(args.stepUsers).toLocaleString()}명\` 단위`,
    `- 사용자 세션 모델: 사용자당 초기 SYNC 1회 + draw event \`${args.eventsPerSession}\`회 + 최종 SYNC 1회`,
    `- Seed history: \`${args.seedHistorySize}\` objects`,
    `- Playwright reconnect samples: \`${args.playwrightSamples}\``,
    "- PASS 기준: reconnect sample 전부 성공, Playwright consistency fail 0%, k6 benchmark fail 0%",
    "## 리소스 제한",
    `- Backend: \`${args.backendCpus} vCPU / ${args.backendMem}\``,
    `- MySQL: \`${args.mysqlCpus} vCPU / ${args.mysqlMem}\``,
    `- Redis: \`${args.redisCpus} vCPU / ${args.redisMem}\``,
    `- Redis settings: \`${args.redisSettings}\``,
    `- Backend JVM: \`${args.javaOpts}\``,
    "## 결과 요약",
  ];

  if (results.length === 0) {
    lines.push("- 결과 파일이 없습니다. 스케일 러너를 먼저 실행해 주세요.");
  } else {
    lines.push(...renderSummary(results));
    lines.push("## 구간별 결과");
    lines.push(...renderTable(results));
    lines.push("## Artifacts");
    lines.push(...renderArtifacts(results, resultsDir));
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
}

main();
