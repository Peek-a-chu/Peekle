#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
RUNNER="${BACKEND_DIR}/benchmark/scripts/run-workbook-preview-k6.sh"

BASE_URL="${BASE_URL:-http://localhost:8082}"
VERSION_LABEL="${VERSION_LABEL:-after}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-20}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-100}"
PROBLEM_COUNT="${PROBLEM_COUNT:-5}"

DATASETS_CSV="${DATASETS:-10000,30000,40000}"
CONCURRENCIES_CSV="${CONCURRENCIES:-10,30,50}"
SCENARIOS_CSV="${SCENARIOS:-start-hit,start-fallback,create-room}"

IFS=',' read -r -a DATASETS <<< "${DATASETS_CSV}"
IFS=',' read -r -a CONCURRENCIES <<< "${CONCURRENCIES_CSV}"
IFS=',' read -r -a SCENARIOS <<< "${SCENARIOS_CSV}"

for scenario in "${SCENARIOS[@]}"; do
  for dataset in "${DATASETS[@]}"; do
    for concurrency in "${CONCURRENCIES[@]}"; do
      echo "[benchmark] scenario=${scenario} dataset=${dataset} concurrency=${concurrency}"
      "${RUNNER}" \
        --scenario "${scenario}" \
        --version "${VERSION_LABEL}" \
        --dataset "${dataset}" \
        --concurrency "${concurrency}" \
        --warmup "${WARMUP_ITERATIONS}" \
        --measure "${MEASURE_ITERATIONS}" \
        --problem-count "${PROBLEM_COUNT}" \
        --base-url "${BASE_URL}"
    done
  done
done
