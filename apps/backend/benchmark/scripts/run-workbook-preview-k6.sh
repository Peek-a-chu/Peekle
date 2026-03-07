#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)
RESULTS_DIR="${BACKEND_DIR}/benchmark/results"
REPORT_PATH="${REPO_ROOT}/docs/spec/workbook-preview-k6-report.md"

SCENARIO="${SCENARIO:-start-hit}"
VERSION_LABEL="${VERSION_LABEL:-after}"
DATASET_SIZE="${DATASET_SIZE:-40000}"
CONCURRENCY="${CONCURRENCY:-10}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-20}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-100}"
PROBLEM_COUNT="${PROBLEM_COUNT:-5}"
BASE_URL="${BASE_URL:-http://localhost:8082}"
METRICS_TOKEN="${METRICS_TOKEN:-}"
METRIC_CACHE_TAG="${METRIC_CACHE_TAG:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scenario)
      SCENARIO="$2"
      shift 2
      ;;
    --version)
      VERSION_LABEL="$2"
      shift 2
      ;;
    --dataset)
      DATASET_SIZE="$2"
      shift 2
      ;;
    --concurrency)
      CONCURRENCY="$2"
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
    --problem-count)
      PROBLEM_COUNT="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
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

if [[ -z "${METRICS_TOKEN}" ]]; then
  METRICS_NICKNAME="benchmark-metrics-$(date +%s%N)"
  METRICS_TOKEN=$(
    curl -sf -X POST "${BASE_URL}/api/dev/users?nickname=${METRICS_NICKNAME}" \
      | jq -r '.extensionToken'
  )
fi

case "${SCENARIO}" in
  create-room)
    K6_SCRIPT="${BACKEND_DIR}/benchmark/k6/create-room.js"
    CACHE_TAG="na"
    ;;
  start-hit)
    K6_SCRIPT="${BACKEND_DIR}/benchmark/k6/start-hit.js"
    CACHE_TAG="hit"
    ;;
  start-fallback)
    K6_SCRIPT="${BACKEND_DIR}/benchmark/k6/start-fallback.js"
    CACHE_TAG="fallback"
    ;;
  *)
    echo "Unsupported scenario: ${SCENARIO}" >&2
    exit 1
    ;;
esac

if [[ -n "${METRIC_CACHE_TAG}" ]]; then
  CACHE_TAG="${METRIC_CACHE_TAG}"
fi

RUN_ID="${VERSION_LABEL}-${SCENARIO}-d${DATASET_SIZE}-c${CONCURRENCY}"
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
    --argjson startSql "$(fetch_metric "game.start.sql_count" "problem_source:WORKBOOK" "result:success" "cache:${CACHE_TAG}")" \
    --argjson createSql "$(fetch_metric "game.create.sql_count" "problem_source:WORKBOOK" "result:success" "cache:na")" \
    --argjson createDuration "$(fetch_metric "game.create.duration" "problem_source:WORKBOOK" "result:success")" \
    --argjson previewBytes "$(fetch_metric "redis.preview.bytes_per_room" "problem_source:WORKBOOK")" \
    --argjson workbookCacheBytes "$(fetch_metric "redis.workbook.cache.bytes_per_workbook" "problem_source:WORKBOOK")" \
    --argjson previewMiss "$(fetch_metric "game.start.preview.miss" "problem_source:WORKBOOK")" \
    --argjson previewRebuild "$(fetch_metric "game.start.preview.rebuild" "problem_source:WORKBOOK")" \
    --argjson startFailure "$(fetch_metric "game.start.failure" "problem_source:WORKBOOK" "cache:${CACHE_TAG}")" \
    '{
      collectedAt: $collectedAt,
      metrics: {
        startSql: $startSql,
        createSql: $createSql,
        createDuration: $createDuration,
        previewBytes: $previewBytes,
        workbookCacheBytes: $workbookCacheBytes,
        previewMiss: $previewMiss,
        previewRebuild: $previewRebuild,
        startFailure: $startFailure
      }
    }'
}

capture_snapshot > "${BEFORE_FILE}"

k6 run \
  --summary-export "${SUMMARY_FILE}" \
  -e BASE_URL="${BASE_URL}" \
  -e DATASET_SIZE="${DATASET_SIZE}" \
  -e VUS="${CONCURRENCY}" \
  -e WARMUP_ITERATIONS="${WARMUP_ITERATIONS}" \
  -e MEASURE_ITERATIONS="${MEASURE_ITERATIONS}" \
  -e PROBLEM_COUNT="${PROBLEM_COUNT}" \
  "${K6_SCRIPT}"

capture_snapshot > "${AFTER_FILE}"

node "${BACKEND_DIR}/benchmark/scripts/generate-workbook-preview-report.mjs" \
  --summary "${SUMMARY_FILE}" \
  --before "${BEFORE_FILE}" \
  --after "${AFTER_FILE}" \
  --scenario "${SCENARIO}" \
  --version "${VERSION_LABEL}" \
  --dataset "${DATASET_SIZE}" \
  --concurrency "${CONCURRENCY}" \
  --warmup "${WARMUP_ITERATIONS}" \
  --measure "${MEASURE_ITERATIONS}" \
  --baseUrl "${BASE_URL}" \
  --results-dir "${RESULTS_DIR}" \
  --output "${REPORT_PATH}"

echo "Generated report: ${REPORT_PATH}"
