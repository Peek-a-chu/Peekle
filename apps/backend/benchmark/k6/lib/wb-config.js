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

function defaultWsBaseUrl(baseUrl) {
  if (baseUrl.startsWith("https://")) {
    return `wss://${baseUrl.slice("https://".length)}`;
  }
  if (baseUrl.startsWith("http://")) {
    return `ws://${baseUrl.slice("http://".length)}`;
  }
  return baseUrl;
}

export function loadWhiteboardConfig() {
  const warmupIterations = parseNumber("WARMUP_ITERATIONS", 10);
  const measureIterations = parseNumber("MEASURE_ITERATIONS", 50);
  const baseUrl = __ENV.BASE_URL || "http://localhost:8082";

  return {
    baseUrl,
    wsBaseUrl: __ENV.WS_BASE_URL || defaultWsBaseUrl(baseUrl),
    syncMode: (__ENV.SYNC_MODE || "default").toLowerCase(),
    warmupIterations,
    measureIterations,
    totalIterations: warmupIterations + measureIterations,
    concurrency: parseNumber("VUS", 5),
    maxDuration: __ENV.MAX_DURATION || "15m",
    maxFailureRate: parseNumber("MAX_FAILURE_RATE", 0.05),
    seedHistorySize: parseNumber("SEED_HISTORY_SIZE", 120),
    eventsPerSession: parseNumber("EVENTS_PER_SESSION", 5),
    sendIntervalMs: parseNumber("SEND_INTERVAL_MS", 150),
    wsConnectTimeoutMs: parseNumber("WS_CONNECT_TIMEOUT_MS", 5000),
    wsSessionTimeoutMs: parseNumber("WS_SESSION_TIMEOUT_MS", 10000),
  };
}

export function buildWhiteboardOptions(config) {
  return {
    scenarios: {
      whiteboard_sync: {
        executor: "shared-iterations",
        vus: config.concurrency,
        iterations: config.totalIterations,
        maxDuration: config.maxDuration,
      },
    },
    setupTimeout: __ENV.SETUP_TIMEOUT || "30m",
    thresholds: {
      benchmark_failure_rate: [`rate<${config.maxFailureRate}`],
      whiteboard_consistency_failure_rate: [`rate<${config.maxFailureRate}`],
      whiteboard_connect_failure_rate: [`rate<${config.maxFailureRate}`],
      whiteboard_event_failure_rate: [`rate<${config.maxFailureRate}`],
    },
  };
}
