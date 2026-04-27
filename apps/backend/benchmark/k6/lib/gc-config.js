function parseNumber(name, fallback) {
  const rawValue = __ENV[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

function toWsBaseUrl(baseUrl) {
  if (baseUrl.startsWith("https://")) {
    return `wss://${baseUrl.slice("https://".length)}`;
  }
  if (baseUrl.startsWith("http://")) {
    return `ws://${baseUrl.slice("http://".length)}`;
  }
  return baseUrl;
}

export function loadGcConfig() {
  const warmupIterations = parseNumber("WARMUP_ITERATIONS", 20);
  const measureIterations = parseNumber("MEASURE_ITERATIONS", 100);
  const concurrency = parseNumber("VUS", 10);
  const totalIterations = warmupIterations + measureIterations;

  if (totalIterations <= 0) {
    throw new Error("WARMUP_ITERATIONS + MEASURE_ITERATIONS must be positive");
  }
  if (concurrency <= 0) {
    throw new Error("VUS must be positive");
  }
  if (totalIterations % concurrency !== 0) {
    throw new Error(
      `Total iterations (${totalIterations}) must be divisible by VUS (${concurrency})`
    );
  }

  const baseUrl = __ENV.BASE_URL || "http://localhost:8082";

  return {
    baseUrl,
    wsBaseUrl: __ENV.WS_BASE_URL || toWsBaseUrl(baseUrl),
    warmupIterations,
    measureIterations,
    totalIterations,
    concurrency,
    iterationsPerVu: totalIterations / concurrency,
    datasetSize: parseNumber("DATASET_SIZE", 40000),
    problemCount: parseNumber("PROBLEM_COUNT", 5),
    maxPlayers: parseNumber("MAX_PLAYERS", 2),
    timeLimitMinutes: parseNumber("TIME_LIMIT_MINUTES", 5),
    maxDuration: __ENV.MAX_DURATION || "30m",
    maxFailureRate: parseNumber("MAX_FAILURE_RATE", 0.05),
    wsSessionMs: parseNumber("WS_SESSION_MS", 2500),
    httpStartDelayMs: parseNumber("HTTP_START_DELAY_MS", 750),
    wsConnectTimeoutMs: parseNumber("WS_CONNECT_TIMEOUT_MS", 1200),
    wsChatIntervalMs: parseNumber("WS_CHAT_INTERVAL_MS", 250),
    wsChatStartDelayMs: parseNumber("WS_CHAT_START_DELAY_MS", 200),
  };
}

function perVuIterationsScenario(exec, config, startTime = "0s") {
  return {
    executor: "per-vu-iterations",
    exec,
    vus: config.concurrency,
    iterations: config.iterationsPerVu,
    maxDuration: config.maxDuration,
    startTime,
  };
}

export function buildGcHttpOptions(config, execName) {
  return {
    scenarios: {
      [execName]: perVuIterationsScenario(execName, config),
    },
    setupTimeout: __ENV.SETUP_TIMEOUT || "30m",
    thresholds: {
      benchmark_failure_rate: [`rate<${config.maxFailureRate}`],
    },
  };
}

export function buildGcMixedOptions(config) {
  return {
    scenarios: {
      httpScenario: perVuIterationsScenario("httpScenario", config),
      wsScenario: perVuIterationsScenario("wsScenario", config),
    },
    setupTimeout: __ENV.SETUP_TIMEOUT || "30m",
    thresholds: {
      benchmark_failure_rate: [`rate<${config.maxFailureRate}`],
      ws_chat_failure_rate: [`rate<${config.maxFailureRate}`],
      ws_connect_failure_rate: [`rate<${config.maxFailureRate}`],
    },
  };
}
