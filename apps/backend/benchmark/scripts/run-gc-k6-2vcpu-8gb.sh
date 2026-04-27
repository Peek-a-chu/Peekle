#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/../.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/../.." && pwd)

exec env \
  RESULTS_DIR="${RESULTS_DIR:-${BACKEND_DIR}/benchmark/results/gc-matrix}" \
  REPORT_PATH="${REPORT_PATH:-${REPO_ROOT}/docs/spec/gc-k6-matrix-report.md}" \
  ENVIRONMENT_LABEL="${ENVIRONMENT_LABEL:-Spring Boot benchmark profile + MySQL 8 + Redis 7 (docker/docker-compose.benchmark.yml, total 2vCPU / 8GB)}" \
  BENCHMARK_BACKEND_CPUS="${BENCHMARK_BACKEND_CPUS:-1.5}" \
  BENCHMARK_BACKEND_MEM_LIMIT="${BENCHMARK_BACKEND_MEM_LIMIT:-6g}" \
  BENCHMARK_MYSQL_CPUS="${BENCHMARK_MYSQL_CPUS:-0.35}" \
  BENCHMARK_MYSQL_MEM_LIMIT="${BENCHMARK_MYSQL_MEM_LIMIT:-1536m}" \
  BENCHMARK_REDIS_CPUS="${BENCHMARK_REDIS_CPUS:-0.15}" \
  BENCHMARK_REDIS_MEM_LIMIT="${BENCHMARK_REDIS_MEM_LIMIT:-512m}" \
  BENCHMARK_JVM_XMS="${BENCHMARK_JVM_XMS:-4g}" \
  BENCHMARK_JVM_XMX="${BENCHMARK_JVM_XMX:-4g}" \
  BENCHMARK_ACTIVE_PROCESSOR_COUNT="${BENCHMARK_ACTIVE_PROCESSOR_COUNT:-2}" \
  COMMON_JAVA_SPEC="${COMMON_JAVA_SPEC:--Xms4g -Xmx4g -XX:ActiveProcessorCount=2 -XX:+UseStringDeduplication -Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime,level,tags}" \
  G1_SPEC="${G1_SPEC:--XX:+UseG1GC}" \
  G1_TUNED_SPEC="${G1_TUNED_SPEC:--XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1ReservePercent=15}" \
  BENCHMARK_G1_TUNED_OPTS="${BENCHMARK_G1_TUNED_OPTS:--XX:MaxGCPauseMillis=100 -XX:InitiatingHeapOccupancyPercent=35 -XX:G1ReservePercent=15}" \
  ZGC_SPEC="${ZGC_SPEC:--XX:+UseZGC -XX:+ZGenerational}" \
  ZGC_TUNED_SPEC="${ZGC_TUNED_SPEC:--XX:SoftMaxHeapSize=3584m}" \
  BENCHMARK_ZGC_TUNED_OPTS="${BENCHMARK_ZGC_TUNED_OPTS:--XX:SoftMaxHeapSize=3584m}" \
  "${SCRIPT_DIR}/run-gc-k6-matrix.sh" \
  "$@"
