#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)
FRONTEND_DIR="${REPO_ROOT}/apps/frontend"

RESULTS_DIR="${RESULTS_DIR:-${BACKEND_DIR}/benchmark/results/whiteboard-sync}"
REPORT_PATH="${REPORT_PATH:-${REPO_ROOT}/docs/spec/whiteboard-sync-benchmark-report.md}"

VERSION_LABEL="${VERSION_LABEL:-before}"
BASE_URL="${BASE_URL:-http://localhost:8082}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost:3001}"
ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL:-Spring Boot benchmark profile + Frontend benchmark harness}"
SYNC_MODE="${SYNC_MODE:-}"
VUS="${VUS:-5}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-10}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-50}"
SEED_HISTORY_SIZE="${SEED_HISTORY_SIZE:-120}"
EVENTS_PER_SESSION="${EVENTS_PER_SESSION:-5}"
SEND_INTERVAL_MS="${SEND_INTERVAL_MS:-150}"
PLAYWRIGHT_SAMPLES="${PLAYWRIGHT_SAMPLES:-5}"
NEW_EVENTS_DURING_DISCONNECT="${NEW_EVENTS_DURING_DISCONNECT:-3}"
PLAYWRIGHT_TIMEOUT_MS="${PLAYWRIGHT_TIMEOUT_MS:-20000}"
PLAYWRIGHT_HEADLESS="${PLAYWRIGHT_HEADLESS:-1}"
INITIAL_MANUAL_SYNC="${INITIAL_MANUAL_SYNC:-1}"
RECONNECT_MANUAL_SYNC="${RECONNECT_MANUAL_SYNC:-0}"
BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-peekle-backend-benchmark}"
SERVER_LOG_MODE="${SERVER_LOG_MODE:-docker}"
SERVER_LOG_PATH="${SERVER_LOG_PATH:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION_LABEL="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --frontend-base-url)
      FRONTEND_BASE_URL="$2"
      shift 2
      ;;
    --report)
      REPORT_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${SYNC_MODE}" ]]; then
  if [[ "${VERSION_LABEL}" == "before" ]]; then
    SYNC_MODE="legacy"
  else
    SYNC_MODE="default"
  fi
fi

RUN_ID="${VERSION_LABEL}-whiteboard-sync-v${VUS}-e${EVENTS_PER_SESSION}-h${SEED_HISTORY_SIZE}"
SUMMARY_FILE="${RESULTS_DIR}/${RUN_ID}.summary.json"
PLAYWRIGHT_FILE="${RESULTS_DIR}/${RUN_ID}.playwright.json"
SERVER_LOG_FILE="${RESULTS_DIR}/${RUN_ID}.server.log"
BENCHMARK_STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "${RESULTS_DIR}"

set +e
k6 run \
  --summary-export "${SUMMARY_FILE}" \
  -e BASE_URL="${BASE_URL}" \
  -e VUS="${VUS}" \
  -e WARMUP_ITERATIONS="${WARMUP_ITERATIONS}" \
  -e MEASURE_ITERATIONS="${MEASURE_ITERATIONS}" \
  -e SYNC_MODE="${SYNC_MODE}" \
  -e SEED_HISTORY_SIZE="${SEED_HISTORY_SIZE}" \
  -e EVENTS_PER_SESSION="${EVENTS_PER_SESSION}" \
  -e SEND_INTERVAL_MS="${SEND_INTERVAL_MS}" \
  "${BACKEND_DIR}/benchmark/k6/whiteboard-sync.js"
k6_exit_code=$?

pnpm --dir "${FRONTEND_DIR}" exec node scripts/whiteboard-reconnect-benchmark.mjs \
  --backendBaseUrl "${BASE_URL}" \
  --frontendBaseUrl "${FRONTEND_BASE_URL}" \
  --samples "${PLAYWRIGHT_SAMPLES}" \
  --seedHistorySize "${SEED_HISTORY_SIZE}" \
  --syncMode "${SYNC_MODE}" \
  --initialManualSync "${INITIAL_MANUAL_SYNC}" \
  --reconnectManualSync "${RECONNECT_MANUAL_SYNC}" \
  --newEventsDuringDisconnect "${NEW_EVENTS_DURING_DISCONNECT}" \
  --timeoutMs "${PLAYWRIGHT_TIMEOUT_MS}" \
  --headless "${PLAYWRIGHT_HEADLESS}" \
  --output "${PLAYWRIGHT_FILE}"
playwright_exit_code=$?
set -e

case "${SERVER_LOG_MODE}" in
  docker)
    docker logs --timestamps --since "${BENCHMARK_STARTED_AT}" "${BACKEND_CONTAINER_NAME}" \
      > "${SERVER_LOG_FILE}" 2>&1 || true
    ;;
  file)
    if [[ -z "${SERVER_LOG_PATH}" ]]; then
      echo "SERVER_LOG_PATH is required when SERVER_LOG_MODE=file" >&2
      exit 1
    fi
    cp "${SERVER_LOG_PATH}" "${SERVER_LOG_FILE}"
    ;;
  *)
    echo "Unsupported SERVER_LOG_MODE: ${SERVER_LOG_MODE}" >&2
    exit 1
    ;;
esac

node "${BACKEND_DIR}/benchmark/scripts/generate-whiteboard-sync-report.mjs" \
  --summary "${SUMMARY_FILE}" \
  --playwright "${PLAYWRIGHT_FILE}" \
  --server-log "${SERVER_LOG_FILE}" \
  --runId "${RUN_ID}" \
  --version "${VERSION_LABEL}" \
  --baseUrl "${BASE_URL}" \
  --frontendBaseUrl "${FRONTEND_BASE_URL}" \
  --syncMode "${SYNC_MODE}" \
  --vus "${VUS}" \
  --warmup "${WARMUP_ITERATIONS}" \
  --measure "${MEASURE_ITERATIONS}" \
  --seedHistorySize "${SEED_HISTORY_SIZE}" \
  --eventsPerSession "${EVENTS_PER_SESSION}" \
  --playwrightSamples "${PLAYWRIGHT_SAMPLES}" \
  --newEventsDuringDisconnect "${NEW_EVENTS_DURING_DISCONNECT}" \
  --environment "${ENVIRONMENT_LABEL}" \
  --results-dir "${RESULTS_DIR}" \
  --output "${REPORT_PATH}"

echo "Generated report: ${REPORT_PATH}"

if (( k6_exit_code != 0 )); then
  echo "k6 exited with status ${k6_exit_code}" >&2
fi

if (( playwright_exit_code != 0 )); then
  echo "Playwright benchmark exited with status ${playwright_exit_code}" >&2
fi

if (( k6_exit_code != 0 )); then
  exit "${k6_exit_code}"
fi

exit "${playwright_exit_code}"
