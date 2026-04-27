#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker/docker-compose.benchmark.yml}"
RESULTS_DIR="${RESULTS_DIR:-${BACKEND_DIR}/benchmark/results/whiteboard-sync-scale-4vcpu-8gb}"
REPORT_PATH="${REPORT_PATH:-${REPO_ROOT}/docs/spec/whiteboard-sync-scale-4vcpu-8gb-report.md}"

BASE_URL="${BASE_URL:-http://localhost:8082}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost:3001}"

START_USERS="${START_USERS:-10000}"
STEP_USERS="${STEP_USERS:-10000}"
MAX_USERS="${MAX_USERS:-50000}"

SEED_HISTORY_SIZE="${SEED_HISTORY_SIZE:-120}"
EVENTS_PER_SESSION="${EVENTS_PER_SESSION:-5}"
SEND_INTERVAL_MS="${SEND_INTERVAL_MS:-150}"
PLAYWRIGHT_SAMPLES="${PLAYWRIGHT_SAMPLES:-3}"
NEW_EVENTS_DURING_DISCONNECT="${NEW_EVENTS_DURING_DISCONNECT:-3}"
PLAYWRIGHT_TIMEOUT_MS="${PLAYWRIGHT_TIMEOUT_MS:-20000}"
PLAYWRIGHT_HEADLESS="${PLAYWRIGHT_HEADLESS:-1}"
INITIAL_MANUAL_SYNC="${INITIAL_MANUAL_SYNC:-1}"
RECONNECT_MANUAL_SYNC="${RECONNECT_MANUAL_SYNC:-0}"
MAX_DURATION="${MAX_DURATION:-60m}"
SETUP_REQUEST_TIMEOUT="${SETUP_REQUEST_TIMEOUT:-120s}"

BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS:-3.0}"
BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT:-6g}"
BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS:-0.7}"
BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT:-1536m}"
BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS:-0.3}"
BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT:-512m}"
BENCHMARK_REDIS_APPENDONLY="${BENCHMARK_REDIS_APPENDONLY:-yes}"
BENCHMARK_REDIS_SAVE_MODE="${BENCHMARK_REDIS_SAVE_MODE:-default}"
BENCHMARK_REDIS_APPENDFSYNC="${BENCHMARK_REDIS_APPENDFSYNC:-everysec}"
BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE="${BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE:-100}"
BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE="${BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE:-64mb}"
BENCHMARK_REDIS_MAXMEMORY_POLICY="${BENCHMARK_REDIS_MAXMEMORY_POLICY:-noeviction}"
BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE="${BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE:-yes}"
BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL="${BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL:-yes}"
BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE="${BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE:-}"
BENCHMARK_REDIS_LIST_COMPRESS_DEPTH="${BENCHMARK_REDIS_LIST_COMPRESS_DEPTH:-}"
BENCHMARK_JAVA_OPTS="${BENCHMARK_JAVA_OPTS:--Xms4g -Xmx4g -XX:ActiveProcessorCount=3 -XX:+UseContainerSupport -Djava.security.egd=file:/dev/./urandom}"
ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL:-Spring Boot benchmark profile + Frontend benchmark harness (docker total 4vCPU / 8GB)}"
REDIS_SETTINGS_LABEL="${REDIS_SETTINGS_LABEL:-appendonly=${BENCHMARK_REDIS_APPENDONLY}, saveMode=${BENCHMARK_REDIS_SAVE_MODE}, appendfsync=${BENCHMARK_REDIS_APPENDFSYNC}, rewrite%=${BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE}, rewriteMinSize=${BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE}, policy=${BENCHMARK_REDIS_MAXMEMORY_POLICY}, listpack=${BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE:-default}, compressDepth=${BENCHMARK_REDIS_LIST_COMPRESS_DEPTH:-default}}"

wait_for_backend() {
  local attempts=0
  while (( attempts < 120 )); do
    if curl -sf -X POST "${BASE_URL}/api/dev/users?nickname=wb-scale-ready-${attempts}-$(date +%s%N)" >/dev/null; then
      sleep 3
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Backend did not become ready within 120 seconds" >&2
  return 1
}

wait_for_frontend() {
  local attempts=0
  local url="${FRONTEND_BASE_URL}/study/1/whiteboard?userId=1&syncMode=default"
  while (( attempts < 60 )); do
    if curl -sfI "${url}" >/dev/null; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Frontend did not become ready within 60 seconds: ${url}" >&2
  return 1
}

reset_benchmark_stack() {
  docker compose -f "${COMPOSE_FILE}" down -v --remove-orphans >/dev/null 2>&1 || true

  BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS}" \
  BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT}" \
  BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS}" \
  BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT}" \
  BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS}" \
  BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT}" \
  BENCHMARK_REDIS_APPENDONLY="${BENCHMARK_REDIS_APPENDONLY}" \
  BENCHMARK_REDIS_SAVE_MODE="${BENCHMARK_REDIS_SAVE_MODE}" \
  BENCHMARK_REDIS_APPENDFSYNC="${BENCHMARK_REDIS_APPENDFSYNC}" \
  BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE="${BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE}" \
  BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE="${BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE}" \
  BENCHMARK_REDIS_MAXMEMORY_POLICY="${BENCHMARK_REDIS_MAXMEMORY_POLICY}" \
  BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE="${BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE}" \
  BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL="${BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL}" \
  BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE="${BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE}" \
  BENCHMARK_REDIS_LIST_COMPRESS_DEPTH="${BENCHMARK_REDIS_LIST_COMPRESS_DEPTH}" \
  BENCHMARK_JAVA_OPTS="${BENCHMARK_JAVA_OPTS}" \
  docker compose -f "${COMPOSE_FILE}" up -d --build --force-recreate mysql redis backend >/dev/null

  wait_for_backend
}

stage_failed() {
  local result_file="$1"
  node -e '
const fs = require("node:fs");
const file = process.argv[1];
if (!fs.existsSync(file)) {
  process.exit(2);
}
const result = JSON.parse(fs.readFileSync(file, "utf8"));
const benchmarkFail = Number(result.k6?.failureRates?.benchmark || 0);
const connectFail = Number(result.k6?.failureRates?.connect || 0);
const eventFail = Number(result.k6?.failureRates?.event || 0);
const consistencyFail = Number(result.playwright?.consistencyFailureRate || 0);
const successfulSamples = Number(result.playwright?.successfulSamples || 0);
const expectedSamples = Number(result.config?.playwrightSamples || 0);
const reconnectOk = successfulSamples >= expectedSamples && expectedSamples > 0;
const eventSamples = Number(result.k6?.eventRtt?.count || 0);
const failed =
  benchmarkFail > 0 ||
  connectFail > 0 ||
  eventFail > 0 ||
  consistencyFail > 0 ||
  eventSamples <= 0 ||
  !reconnectOk;
process.exit(failed ? 1 : 0);
' "${result_file}"
}

container_state_json() {
  local container_name="$1"
  docker inspect "${container_name}" --format '{{json .State}}' 2>/dev/null || printf '{}'
}

write_failure_result() {
  local result_file="$1"
  local users="$2"
  local label="$3"
  local run_id="$4"
  local exit_code="$5"
  local redis_state
  local mysql_state
  local backend_state

  redis_state=$(container_state_json "peekle-redis-benchmark")
  mysql_state=$(container_state_json "peekle-mysql-benchmark")
  backend_state=$(container_state_json "peekle-backend-benchmark")

  node -e '
const fs = require("node:fs");
const path = require("node:path");
const [file, users, label, runId, exitCode, environment, baseUrl, frontendBaseUrl, seedHistorySize, eventsPerSession, playwrightSamples, redisStateRaw, mysqlStateRaw, backendStateRaw] = process.argv.slice(1);
const emptySummary = { count: 0, avg: 0, min: 0, p50: 0, p95: 0, max: 0 };
const parseState = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};
const redisState = parseState(redisStateRaw);
const mysqlState = parseState(mysqlStateRaw);
const backendState = parseState(backendStateRaw);
const reasonParts = [];
if (redisState.OOMKilled) {
  reasonParts.push("redis OOMKilled");
}
if (redisState.ExitCode) {
  reasonParts.push(`redis exit=${redisState.ExitCode}`);
}
if (Number(exitCode) !== 0) {
  reasonParts.push(`runner exit=${exitCode}`);
}
const failureReason = reasonParts.length > 0 ? reasonParts.join(", ") : "result file missing";
const payload = {
  id: runId,
  version: label,
  generatedAt: new Date().toISOString(),
  environment,
  config: {
    baseUrl,
    frontendBaseUrl,
    syncMode: "default",
    vus: Number(users),
    warmupIterations: 0,
    measureIterations: Number(users),
    seedHistorySize: Number(seedHistorySize),
    eventsPerSession: Number(eventsPerSession),
    playwrightSamples: Number(playwrightSamples),
    newEventsDuringDisconnect: 0,
  },
  k6: {
    benchmarkDuration: { avg: 0, p50: 0, p95: 0, max: 0 },
    eventRtt: emptySummary,
    syncRtt: emptySummary,
    failureRates: {
      benchmark: 1,
      connect: 1,
      event: 1,
      consistency: 1,
    },
  },
  playwright: {
    reconnectRestoreMs: emptySummary,
    consistencyFailureRate: 1,
    successfulSamples: 0,
    failedSamples: Number(playwrightSamples),
  },
  serverLog: {
    totalBenchEvents: 0,
    counts: {},
    maxHistoryCount: 0,
    maxRevision: 0,
    eventProcessingLatencyMs: emptySummary,
    syncResponseLatencyMs: emptySummary,
  },
  failure: {
    type: "infrastructure",
    reason: failureReason,
    dockerStates: {
      backend: backendState,
      mysql: mysqlState,
      redis: redisState,
    },
  },
  paths: {
    summary: "",
    playwright: "",
    serverLog: "",
  },
};
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(payload, null, 2));
' "${result_file}" "${users}" "${label}" "${run_id}" "${exit_code}" "${ENVIRONMENT_LABEL}" "${BASE_URL}" "${FRONTEND_BASE_URL}" "${SEED_HISTORY_SIZE}" "${EVENTS_PER_SESSION}" "${PLAYWRIGHT_SAMPLES}" "${redis_state}" "${mysql_state}" "${backend_state}"
}

run_stage() {
  local users="$1"
  local label="u${users}"
  local single_report="${RESULTS_DIR}/${label}.report.md"
  local run_id="${label}-whiteboard-sync-v${users}-e${EVENTS_PER_SESSION}-h${SEED_HISTORY_SIZE}"
  local result_file="${RESULTS_DIR}/${run_id}.result.json"
  local exit_code=0

  reset_benchmark_stack

  set +e
  env \
    RESULTS_DIR="${RESULTS_DIR}" \
    REPORT_PATH="${single_report}" \
    VERSION_LABEL="${label}" \
    BASE_URL="${BASE_URL}" \
    FRONTEND_BASE_URL="${FRONTEND_BASE_URL}" \
    ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL}" \
    VUS="${users}" \
    WARMUP_ITERATIONS="0" \
    MEASURE_ITERATIONS="${users}" \
    MAX_DURATION="${MAX_DURATION}" \
    SETUP_REQUEST_TIMEOUT="${SETUP_REQUEST_TIMEOUT}" \
    SEED_HISTORY_SIZE="${SEED_HISTORY_SIZE}" \
    EVENTS_PER_SESSION="${EVENTS_PER_SESSION}" \
    SEND_INTERVAL_MS="${SEND_INTERVAL_MS}" \
    PLAYWRIGHT_SAMPLES="${PLAYWRIGHT_SAMPLES}" \
    NEW_EVENTS_DURING_DISCONNECT="${NEW_EVENTS_DURING_DISCONNECT}" \
    PLAYWRIGHT_TIMEOUT_MS="${PLAYWRIGHT_TIMEOUT_MS}" \
    PLAYWRIGHT_HEADLESS="${PLAYWRIGHT_HEADLESS}" \
    INITIAL_MANUAL_SYNC="${INITIAL_MANUAL_SYNC}" \
    RECONNECT_MANUAL_SYNC="${RECONNECT_MANUAL_SYNC}" \
    SERVER_LOG_MODE="docker" \
    BACKEND_CONTAINER_NAME="peekle-backend-benchmark" \
    "${SCRIPT_DIR}/run-whiteboard-sync-benchmark.sh" \
    --version "${label}" \
    --report "${single_report}"
  exit_code=$?
  set -e

  if [[ ! -f "${result_file}" ]]; then
    write_failure_result "${result_file}" "${users}" "${label}" "${run_id}" "${exit_code}"
    echo "[whiteboard-scale] wrote synthetic failure result for users=${users}: ${result_file}" >&2
  fi

  if (( exit_code != 0 )); then
    echo "[whiteboard-scale] runner exited with status ${exit_code} for users=${users}" >&2
  fi

  stage_failed "${result_file}"
  local status=$?
  if (( status != 0 )); then
    if (( status == 2 )); then
      echo "[whiteboard-scale] could not evaluate result for users=${users}" >&2
    else
      echo "[whiteboard-scale] stopping at first failing band: users=${users}" >&2
    fi
    return 1
  fi

  return 0
}

mkdir -p "${RESULTS_DIR}"
wait_for_frontend

current_users="${START_USERS}"
while (( current_users <= MAX_USERS )); do
  echo "[whiteboard-scale] running users=${current_users}" >&2
  if ! run_stage "${current_users}"; then
    break
  fi
  current_users=$((current_users + STEP_USERS))
done

node "${SCRIPT_DIR}/generate-whiteboard-sync-scale-report.mjs" \
  --results-dir "${RESULTS_DIR}" \
  --output "${REPORT_PATH}" \
  --environment "${ENVIRONMENT_LABEL}" \
  --baseUrl "${BASE_URL}" \
  --frontendBaseUrl "${FRONTEND_BASE_URL}" \
  --startUsers "${START_USERS}" \
  --stepUsers "${STEP_USERS}" \
  --maxUsers "${MAX_USERS}" \
  --eventsPerSession "${EVENTS_PER_SESSION}" \
  --seedHistorySize "${SEED_HISTORY_SIZE}" \
  --playwrightSamples "${PLAYWRIGHT_SAMPLES}" \
  --backendCpus "${BENCHMARK_BACKEND_CPUS}" \
  --backendMem "${BENCHMARK_BACKEND_MEM_LIMIT}" \
  --mysqlCpus "${BENCHMARK_MYSQL_CPUS}" \
  --mysqlMem "${BENCHMARK_MYSQL_MEM_LIMIT}" \
  --redisCpus "${BENCHMARK_REDIS_CPUS}" \
  --redisMem "${BENCHMARK_REDIS_MEM_LIMIT}" \
  --redisSettings "${REDIS_SETTINGS_LABEL}" \
  --javaOpts "${BENCHMARK_JAVA_OPTS}"

echo "Generated scale report: ${REPORT_PATH}"
