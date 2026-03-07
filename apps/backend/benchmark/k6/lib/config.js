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

export function loadConfig() {
  const datasetSize = parseNumber("DATASET_SIZE", 50);
  const warmupIterations = parseNumber("WARMUP_ITERATIONS", 20);
  const measureIterations = parseNumber("MEASURE_ITERATIONS", 100);
  const problemCount = parseNumber("PROBLEM_COUNT", Math.min(5, datasetSize));

  return {
    baseUrl: __ENV.BASE_URL || "http://localhost:8082",
    datasetSize,
    warmupIterations,
    measureIterations,
    totalIterations: warmupIterations + measureIterations,
    concurrency: parseNumber("VUS", 10),
    problemCount,
    maxPlayers: parseNumber("MAX_PLAYERS", 2),
    timeLimitMinutes: parseNumber("TIME_LIMIT_MINUTES", 5),
    maxDuration: __ENV.MAX_DURATION || "30m",
    maxFailureRate: parseNumber("MAX_FAILURE_RATE", 0.05),
  };
}

export function buildOptions(name, config) {
  return {
    scenarios: {
      [name]: {
        executor: "shared-iterations",
        vus: config.concurrency,
        iterations: config.totalIterations,
        maxDuration: config.maxDuration,
      },
    },
    setupTimeout: __ENV.SETUP_TIMEOUT || "30m",
    thresholds: {
      benchmark_failure_rate: [`rate<${config.maxFailureRate}`],
    },
  };
}
