#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)

CANDIDATES="${CANDIDATES:-3840m,3904m,3968m}"
BASE_RESULTS_DIR="${BASE_RESULTS_DIR:-${BACKEND_DIR}/benchmark/results}"
SCENARIOS="${SCENARIOS:-http-io,http-cpu,http-ws-io,http-ws-cpu}"
VUS_LIST="${VUS_LIST:-10,30}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-20}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-100}"
MAX_DURATION="${MAX_DURATION:-30m}"

split_csv() {
  local value="$1"
  IFS=',' read -r -a SPLIT_CSV_RESULT <<< "${value}"
}

slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-'
}

run_candidate() {
  local softmax="$1"
  local slug
  local results_dir
  local report_path

  slug=$(slugify "softmax-${softmax}")
  results_dir="${BASE_RESULTS_DIR}/zgc-tune-screen-2vcpu-8gb-${slug}"
  report_path="${results_dir}/report.md"

  RESULTS_DIR_TO_CLEAR="${results_dir}" python3 - <<'PY'
import os
import shutil
from pathlib import Path

shutil.rmtree(Path(os.environ["RESULTS_DIR_TO_CLEAR"]), ignore_errors=True)
PY

  echo "[zgc-tune-screen] softmax=${softmax} results=${results_dir}"

  if env \
    RESULTS_DIR="${results_dir}" \
    REPORT_PATH="${report_path}" \
    COLLECTORS="zgc-tuned" \
    SCENARIOS="${SCENARIOS}" \
    VUS_LIST="${VUS_LIST}" \
    WARMUP_ITERATIONS="${WARMUP_ITERATIONS}" \
    MEASURE_ITERATIONS="${MEASURE_ITERATIONS}" \
    MAX_DURATION="${MAX_DURATION}" \
    ZGC_TUNED_SPEC="-XX:SoftMaxHeapSize=${softmax}" \
    BENCHMARK_ZGC_TUNED_OPTS="-XX:SoftMaxHeapSize=${softmax}" \
    bash "${SCRIPT_DIR}/run-gc-k6-2vcpu-8gb.sh"; then
    echo "[zgc-tune-screen] softmax=${softmax} status=ok"
  else
    echo "[zgc-tune-screen] softmax=${softmax} status=fail"
  fi
}

main() {
  local candidates
  split_csv "${CANDIDATES}"
  candidates=("${SPLIT_CSV_RESULT[@]}")

  for softmax in "${candidates[@]}"; do
    run_candidate "${softmax}"
  done
}

main "$@"
