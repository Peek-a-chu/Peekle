#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker/docker-compose.benchmark.yml}"
RESULTS_DIR="${RESULTS_DIR:-${BACKEND_DIR}/benchmark/results/gc-matrix}"
REPORT_PATH="${REPORT_PATH:-${REPO_ROOT}/docs/spec/gc-k6-matrix-report.md}"

BASE_URL="${BASE_URL:-http://localhost:8082}"
DATASET_SIZE="${DATASET_SIZE:-40000}"
PROBLEM_COUNT="${PROBLEM_COUNT:-5}"
WARMUP_ITERATIONS="${WARMUP_ITERATIONS:-20}"
MEASURE_ITERATIONS="${MEASURE_ITERATIONS:-100}"
MAX_DURATION="${MAX_DURATION:-30m}"
WS_SESSION_MS="${WS_SESSION_MS:-2500}"
HTTP_START_DELAY_MS="${HTTP_START_DELAY_MS:-750}"
WS_CONNECT_TIMEOUT_MS="${WS_CONNECT_TIMEOUT_MS:-1200}"
WS_CHAT_INTERVAL_MS="${WS_CHAT_INTERVAL_MS:-250}"
WS_CHAT_START_DELAY_MS="${WS_CHAT_START_DELAY_MS:-200}"
BENCHMARK_STARTUP_STABILIZATION_SECONDS="${BENCHMARK_STARTUP_STABILIZATION_SECONDS:-5}"
ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL:-Spring Boot benchmark profile + MySQL 8 + Redis 7 (docker/docker-compose.benchmark.yml, total 2vCPU / 8GB)}"
BENCHMARK_JVM_XMS="${BENCHMARK_JVM_XMS:-4g}"
BENCHMARK_JVM_XMX="${BENCHMARK_JVM_XMX:-4g}"
BENCHMARK_ACTIVE_PROCESSOR_COUNT="${BENCHMARK_ACTIVE_PROCESSOR_COUNT:-2}"
BENCHMARK_COMMON_JAVA_OPTS_APPEND="${BENCHMARK_COMMON_JAVA_OPTS_APPEND:-}"
BENCHMARK_G1_EXTRA_OPTS="${BENCHMARK_G1_EXTRA_OPTS:-}"
BENCHMARK_G1_TUNED_OPTS="${BENCHMARK_G1_TUNED_OPTS:--XX:MaxGCPauseMillis=100 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1ReservePercent=15}"
BENCHMARK_ZGC_EXTRA_OPTS="${BENCHMARK_ZGC_EXTRA_OPTS:-}"
BENCHMARK_ZGC_TUNED_OPTS="${BENCHMARK_ZGC_TUNED_OPTS:--XX:SoftMaxHeapSize=3584m}"
COMMON_JAVA_SPEC="${COMMON_JAVA_SPEC:--Xms4g -Xmx4g -XX:ActiveProcessorCount=2 -XX:+UseStringDeduplication -Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime,level,tags}"
G1_SPEC="${G1_SPEC:--XX:+UseG1GC}"
G1_TUNED_SPEC="${G1_TUNED_SPEC:--XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1ReservePercent=15}"
ZGC_SPEC="${ZGC_SPEC:--XX:+UseZGC -XX:+ZGenerational}"
ZGC_TUNED_SPEC="${ZGC_TUNED_SPEC:--XX:+UseZGC -XX:+ZGenerational -XX:SoftMaxHeapSize=3584m}"

COLLECTORS="${COLLECTORS:-g1,zgc,zgc-tuned}"
SCENARIOS="${SCENARIOS:-http-io,http-cpu,http-ws-io,http-ws-cpu}"
VUS_LIST="${VUS_LIST:-10,30}"

BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS:-1.5}"
BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT:-6g}"
BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS:-0.35}"
BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT:-1536m}"
BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS:-0.15}"
BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT:-512m}"

mkdir -p "${RESULTS_DIR}"

split_csv() {
  local value="$1"
  IFS=',' read -r -a SPLIT_CSV_RESULT <<< "${value}"
}

wait_for_backend() {
  local attempts=0
  while (( attempts < 90 )); do
    if curl -sf -X POST "${BASE_URL}/api/dev/users?nickname=benchmark-ready-${attempts}-$(date +%s%N)" >/dev/null; then
      sleep "${BENCHMARK_STARTUP_STABILIZATION_SECONDS}"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Backend did not become ready within 90 seconds" >&2
  return 1
}

issue_metrics_token() {
  local nickname="benchmark-metrics-$(date +%s%N)"
  curl -sf -X POST "${BASE_URL}/api/dev/users?nickname=${nickname}" | jq -r '.extensionToken'
}

fetch_metric() {
  local metrics_token="$1"
  local metric_name="$2"
  local url="${BASE_URL}/actuator/metrics/${metric_name}"
  if ! curl -sf -H "X-Peekle-Token: ${metrics_token}" "${url}"; then
    printf '{"name":"%s","measurements":[],"availableTags":[]}\n' "${metric_name}"
  fi
}

capture_snapshot() {
  local metrics_token="$1"
  jq -n \
    --arg collectedAt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --argjson gcPause "$(fetch_metric "${metrics_token}" "jvm.gc.pause")" \
    --argjson gcOverhead "$(fetch_metric "${metrics_token}" "jvm.gc.overhead")" \
    --argjson gcAllocated "$(fetch_metric "${metrics_token}" "jvm.gc.memory.allocated")" \
    --argjson gcPromoted "$(fetch_metric "${metrics_token}" "jvm.gc.memory.promoted")" \
    --argjson gcLiveDataSize "$(fetch_metric "${metrics_token}" "jvm.gc.live.data.size")" \
    --argjson jvmMemoryUsed "$(fetch_metric "${metrics_token}" "jvm.memory.used")" \
    --argjson processCpuUsage "$(fetch_metric "${metrics_token}" "process.cpu.usage")" \
    --argjson jvmThreadsLive "$(fetch_metric "${metrics_token}" "jvm.threads.live")" \
    --argjson systemCpuCount "$(fetch_metric "${metrics_token}" "system.cpu.count")" \
    '{
      collectedAt: $collectedAt,
      metrics: {
        gcPause: $gcPause,
        gcOverhead: $gcOverhead,
        gcAllocated: $gcAllocated,
        gcPromoted: $gcPromoted,
        gcLiveDataSize: $gcLiveDataSize,
        jvmMemoryUsed: $jvmMemoryUsed,
        processCpuUsage: $processCpuUsage,
        jvmThreadsLive: $jvmThreadsLive,
        systemCpuCount: $systemCpuCount
      }
    }'
}

collector_java_opts() {
  local collector="$1"
  local common="-Xms${BENCHMARK_JVM_XMS} -Xmx${BENCHMARK_JVM_XMX} -XX:ActiveProcessorCount=${BENCHMARK_ACTIVE_PROCESSOR_COUNT} -XX:+UseStringDeduplication -Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime,level,tags"

  if [[ -n "${BENCHMARK_COMMON_JAVA_OPTS_APPEND}" ]]; then
    common="${common} ${BENCHMARK_COMMON_JAVA_OPTS_APPEND}"
  fi

  case "${collector}" in
    g1)
      printf '%s %s %s\n' "${common}" "-XX:+UseG1GC" "${BENCHMARK_G1_EXTRA_OPTS}"
      ;;
    g1-tuned)
      printf '%s %s %s\n' "${common}" "-XX:+UseG1GC" "${BENCHMARK_G1_TUNED_OPTS}"
      ;;
    zgc)
      printf '%s %s %s\n' "${common}" "-XX:+UseZGC -XX:+ZGenerational" "${BENCHMARK_ZGC_EXTRA_OPTS}"
      ;;
    zgc-tuned)
      printf '%s %s %s\n' "${common}" "-XX:+UseZGC -XX:+ZGenerational" "${BENCHMARK_ZGC_TUNED_OPTS}"
      ;;
    *)
      echo "Unsupported collector: ${collector}" >&2
      return 1
      ;;
  esac
}

scenario_script() {
  local scenario="$1"
  case "${scenario}" in
    http-io)
      printf '%s\n' "${BACKEND_DIR}/benchmark/k6/gc-http-io.js"
      ;;
    http-cpu)
      printf '%s\n' "${BACKEND_DIR}/benchmark/k6/gc-http-cpu.js"
      ;;
    http-ws-io)
      printf '%s\n' "${BACKEND_DIR}/benchmark/k6/gc-http-ws-io.js"
      ;;
    http-ws-cpu)
      printf '%s\n' "${BACKEND_DIR}/benchmark/k6/gc-http-ws-cpu.js"
      ;;
    *)
      echo "Unsupported scenario: ${scenario}" >&2
      return 1
      ;;
  esac
}

verify_collector() {
  local metrics_token="$1"
  local collector="$2"
  local attempts=0
  local metric
  local container_env
  local expected=""

  while (( attempts < 15 )); do
    metric=$(curl -sf -H "X-Peekle-Token: ${metrics_token}" "${BASE_URL}/actuator/metrics/jvm.gc.pause" || true)
    container_env=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' peekle-backend-benchmark 2>/dev/null || true)

    case "${collector}" in
      g1|g1-tuned)
        expected="UseG1GC"
        if echo "${metric}" | rg -q "G1"; then
          return 0
        fi
        if [[ "${container_env}" == *"JAVA_OPTS="*"-XX:+UseG1GC"* ]]; then
          return 0
        fi
        ;;
      zgc|zgc-tuned)
        expected="UseZGC"
        if echo "${metric}" | rg -q "ZGC"; then
          return 0
        fi
        if [[ "${container_env}" == *"JAVA_OPTS="*"-XX:+UseZGC"* ]]; then
          return 0
        fi
        ;;
    esac

    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Expected ${expected} collector but verification never succeeded" >&2
  return 1
}

start_docker_stats_sampler() {
  local output_file="$1"
  (
    while true; do
      docker stats --no-stream --format '{{json .}}' peekle-backend-benchmark >> "${output_file}" || true
      sleep 1
    done
  ) &
  DOCKER_STATS_PID=$!
}

copy_gc_log() {
  local destination="$1"
  if ! docker cp peekle-backend-benchmark:/tmp/gc.log "${destination}" >/dev/null 2>&1; then
    : > "${destination}"
  fi
}

run_cell() {
  local collector="$1"
  local scenario="$2"
  local vus="$3"
  local java_opts
  local metrics_token
  local run_id
  local summary_file
  local before_file
  local after_file
  local docker_stats_file
  local gc_log_file
  local docker_stats_pid
  local k6_status=0
  local report_status=0

  java_opts=$(collector_java_opts "${collector}")

  BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS}" \
  BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT}" \
  BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS}" \
  BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT}" \
  BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS}" \
  BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT}" \
  docker compose -f "${COMPOSE_FILE}" up -d mysql redis >/dev/null

  BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS}" \
  BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT}" \
  BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS}" \
  BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT}" \
  BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS}" \
  BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT}" \
  BENCHMARK_JAVA_OPTS="${java_opts}" \
  docker compose -f "${COMPOSE_FILE}" up -d --build --force-recreate backend >/dev/null

  if ! wait_for_backend; then
    echo "[gc-benchmark][error] backend readiness failed for collector=${collector} scenario=${scenario} vus=${vus}" >&2
    return 1
  fi
  metrics_token=$(issue_metrics_token)
  if ! verify_collector "${metrics_token}" "${collector}"; then
    echo "[gc-benchmark][error] collector verification failed for collector=${collector} scenario=${scenario} vus=${vus}" >&2
    return 1
  fi

  run_id="${collector}-${scenario}-c${vus}"
  summary_file="${RESULTS_DIR}/${run_id}.summary.json"
  before_file="${RESULTS_DIR}/${run_id}.before.json"
  after_file="${RESULTS_DIR}/${run_id}.after.json"
  docker_stats_file="${RESULTS_DIR}/${run_id}.docker-stats.jsonl"
  gc_log_file="${RESULTS_DIR}/${run_id}.gc.log"

  capture_snapshot "${metrics_token}" > "${before_file}"
  : > "${docker_stats_file}"
  start_docker_stats_sampler "${docker_stats_file}"
  docker_stats_pid="${DOCKER_STATS_PID}"

  if env -u COLLECTORS -u SCENARIOS -u VUS_LIST \
    k6 run \
      --summary-export "${summary_file}" \
      -e BASE_URL="${BASE_URL}" \
      -e DATASET_SIZE="${DATASET_SIZE}" \
      -e PROBLEM_COUNT="${PROBLEM_COUNT}" \
      -e VUS="${vus}" \
      -e WARMUP_ITERATIONS="${WARMUP_ITERATIONS}" \
      -e MEASURE_ITERATIONS="${MEASURE_ITERATIONS}" \
      -e MAX_DURATION="${MAX_DURATION}" \
      -e WS_SESSION_MS="${WS_SESSION_MS}" \
      -e HTTP_START_DELAY_MS="${HTTP_START_DELAY_MS}" \
      -e WS_CONNECT_TIMEOUT_MS="${WS_CONNECT_TIMEOUT_MS}" \
      -e WS_CHAT_INTERVAL_MS="${WS_CHAT_INTERVAL_MS}" \
      -e WS_CHAT_START_DELAY_MS="${WS_CHAT_START_DELAY_MS}" \
      "$(scenario_script "${scenario}")"; then
    k6_status=0
  else
    k6_status=$?
    echo "[gc-benchmark][warn] k6 failed for collector=${collector} scenario=${scenario} vus=${vus} status=${k6_status}" >&2
  fi

  kill "${docker_stats_pid}" >/dev/null 2>&1 || true
  wait "${docker_stats_pid}" 2>/dev/null || true

  capture_snapshot "${metrics_token}" > "${after_file}"
  copy_gc_log "${gc_log_file}"

  if node "${BACKEND_DIR}/benchmark/scripts/generate-gc-k6-report.mjs" \
    --summary "${summary_file}" \
    --before "${before_file}" \
    --after "${after_file}" \
    --docker-stats "${docker_stats_file}" \
    --gc-log "${gc_log_file}" \
    --collector "${collector}" \
    --scenario "${scenario}" \
    --concurrency "${vus}" \
    --warmup "${WARMUP_ITERATIONS}" \
    --measure "${MEASURE_ITERATIONS}" \
    --baseUrl "${BASE_URL}" \
    --environment "${ENVIRONMENT_LABEL}" \
    --results-dir "${RESULTS_DIR}" \
    --common-spec "${COMMON_JAVA_SPEC}" \
    --g1-spec "${G1_SPEC}" \
    --g1-tuned-spec "${G1_TUNED_SPEC}" \
    --zgc-spec "${ZGC_SPEC}" \
    --zgc-tuned-spec "${ZGC_TUNED_SPEC}" \
    --output "${REPORT_PATH}"; then
    report_status=0
  else
    report_status=$?
    echo "[gc-benchmark][warn] report generation failed for collector=${collector} scenario=${scenario} vus=${vus} status=${report_status}" >&2
  fi

  if (( k6_status != 0 || report_status != 0 )); then
    return 1
  fi
}

main() {
  local collectors scenarios vus_list
  local failures=()
  split_csv "${COLLECTORS}"
  collectors=("${SPLIT_CSV_RESULT[@]}")
  split_csv "${SCENARIOS}"
  scenarios=("${SPLIT_CSV_RESULT[@]}")
  split_csv "${VUS_LIST}"
  vus_list=("${SPLIT_CSV_RESULT[@]}")

  for collector in "${collectors[@]}"; do
    for scenario in "${scenarios[@]}"; do
      for vus in "${vus_list[@]}"; do
        echo "[gc-benchmark] collector=${collector} scenario=${scenario} vus=${vus}"
        if ! run_cell "${collector}" "${scenario}" "${vus}"; then
          failures+=("${collector}:${scenario}:${vus}")
        fi
      done
    done
  done

  node "${BACKEND_DIR}/benchmark/scripts/generate-gc-k6-report.mjs" \
    --results-dir "${RESULTS_DIR}" \
    --environment "${ENVIRONMENT_LABEL}" \
    --common-spec "${COMMON_JAVA_SPEC}" \
    --g1-spec "${G1_SPEC}" \
    --g1-tuned-spec "${G1_TUNED_SPEC}" \
    --zgc-spec "${ZGC_SPEC}" \
    --zgc-tuned-spec "${ZGC_TUNED_SPEC}" \
    --output "${REPORT_PATH}"

  echo "Generated report: ${REPORT_PATH}"
  if (( ${#failures[@]} > 0 )); then
    echo "[gc-benchmark] failed cells: ${failures[*]}" >&2
    return 1
  fi
}

main "$@"
