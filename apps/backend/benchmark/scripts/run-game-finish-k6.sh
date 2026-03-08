#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)
RESULTS_DIR="${BACKEND_DIR}/benchmark/results/game-finish"
REPORT_PATH="${REPO_ROOT}/docs/spec/game-finish-idempotency-k6-report.md"

VERSION_LABEL="${VERSION_LABEL:-before}"
CONCURRENCY="${CONCURRENCY:-10}"
FANOUT_SIZE="${FANOUT_SIZE:-${CONCURRENCY}}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-20}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-100}"
BASE_URL="${BASE_URL:-http://localhost:8082}"
ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL:-Spring Boot benchmark profile + MySQL 8 + Redis 7 (docker/docker-compose.benchmark.yml)}"
METRICS_TOKEN="${METRICS_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION_LABEL="$2"
      shift 2
      ;;
    --concurrency)
      CONCURRENCY="$2"
      shift 2
      ;;
    --fanout)
      FANOUT_SIZE="$2"
      shift 2
      ;;
    --warmup)
      WARMUP_ITERATIONS="$2"
      shift 2
      ;;
    --measure)
      MEASURE_ITERATIONS="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT_LABEL="$2"
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

if (( FANOUT_SIZE <= 0 )); then
  echo "FANOUT_SIZE must be positive" >&2
  exit 1
fi

if (( WARMUP_ITERATIONS % FANOUT_SIZE != 0 )); then
  echo "WARMUP_ITERATIONS must be a multiple of FANOUT_SIZE" >&2
  exit 1
fi

if (( MEASURE_ITERATIONS % FANOUT_SIZE != 0 )); then
  echo "MEASURE_ITERATIONS must be a multiple of FANOUT_SIZE" >&2
  exit 1
fi

TOTAL_ITERATIONS=$((WARMUP_ITERATIONS + MEASURE_ITERATIONS))
ROOM_COUNT=$((TOTAL_ITERATIONS / FANOUT_SIZE))

if (( ROOM_COUNT <= 0 )); then
  echo "ROOM_COUNT must be positive" >&2
  exit 1
fi

if [[ -z "${METRICS_TOKEN}" ]]; then
  METRICS_NICKNAME="benchmark-metrics-$(date +%s%N)"
  METRICS_TOKEN=$(
    curl -sf -X POST "${BASE_URL}/api/dev/users?nickname=${METRICS_NICKNAME}" \
      | jq -r '.extensionToken'
  )
fi

RUN_ID="${VERSION_LABEL}-finish-race-c${CONCURRENCY}-f${FANOUT_SIZE}"
SUMMARY_FILE="${RESULTS_DIR}/${RUN_ID}.summary.json"
BEFORE_FILE="${RESULTS_DIR}/${RUN_ID}.before.json"
AFTER_FILE="${RESULTS_DIR}/${RUN_ID}.after.json"

mkdir -p "${RESULTS_DIR}"

fetch_metric() {
  local metric_name="$1"
  shift

  local url="${BASE_URL}/actuator/metrics/${metric_name}"
  local separator="?"
  local tag
  for tag in "$@"; do
    if [[ -n "${tag}" ]]; then
      url="${url}${separator}tag=${tag}"
      separator="&"
    fi
  done

  if ! curl -sf -H "X-Peekle-Token: ${METRICS_TOKEN}" "${url}"; then
    printf '{"name":"%s","measurements":[],"availableTags":[]}\n' "${metric_name}"
  fi
}

capture_snapshot() {
  jq -n \
    --arg collectedAt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --argjson finishDuration "$(fetch_metric "game.finish.duration" "trigger:manual")" \
    --argjson finishSql "$(fetch_metric "game.finish.sql_count" "trigger:manual")" \
    --argjson finishDurationProcessed "$(fetch_metric "game.finish.duration" "trigger:manual" "result:processed")" \
    --argjson finishSqlProcessed "$(fetch_metric "game.finish.sql_count" "trigger:manual" "result:processed")" \
    --argjson finishResultProcessed "$(fetch_metric "game.finish.result.processed" "trigger:manual")" \
    --argjson finishEventPublished "$(fetch_metric "game.finish.event.published" "trigger:manual")" \
    --argjson finishPointLogWritten "$(fetch_metric "game.finish.point_log_written" "trigger:manual")" \
    --argjson finishClaimGranted "$(fetch_metric "game.finish.claim.granted" "trigger:manual")" \
    --argjson finishClaimRejected "$(fetch_metric "game.finish.claim.rejected" "trigger:manual")" \
    '{
      collectedAt: $collectedAt,
      metrics: {
        finishDuration: $finishDuration,
        finishSql: $finishSql,
        finishDurationProcessed: $finishDurationProcessed,
        finishSqlProcessed: $finishSqlProcessed,
        finishResultProcessed: $finishResultProcessed,
        finishEventPublished: $finishEventPublished,
        finishPointLogWritten: $finishPointLogWritten,
        finishClaimGranted: $finishClaimGranted,
        finishClaimRejected: $finishClaimRejected
      }
    }'
}

capture_snapshot > "${BEFORE_FILE}"

k6 run \
  --summary-export "${SUMMARY_FILE}" \
  -e BASE_URL="${BASE_URL}" \
  -e VUS="${CONCURRENCY}" \
  -e FANOUT_SIZE="${FANOUT_SIZE}" \
  -e WARMUP_ITERATIONS="${WARMUP_ITERATIONS}" \
  -e MEASURE_ITERATIONS="${MEASURE_ITERATIONS}" \
  "${BACKEND_DIR}/benchmark/k6/finish-race.js"

capture_snapshot > "${AFTER_FILE}"

node "${BACKEND_DIR}/benchmark/scripts/generate-game-finish-report.mjs" \
  --summary "${SUMMARY_FILE}" \
  --before "${BEFORE_FILE}" \
  --after "${AFTER_FILE}" \
  --version "${VERSION_LABEL}" \
  --concurrency "${CONCURRENCY}" \
  --fanout "${FANOUT_SIZE}" \
  --warmup "${WARMUP_ITERATIONS}" \
  --measure "${MEASURE_ITERATIONS}" \
  --roomCount "${ROOM_COUNT}" \
  --baseUrl "${BASE_URL}" \
  --environment "${ENVIRONMENT_LABEL}" \
  --results-dir "${RESULTS_DIR}" \
  --output "${REPORT_PATH}"

echo "Generated report: ${REPORT_PATH}"
