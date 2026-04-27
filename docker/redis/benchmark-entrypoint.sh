#!/bin/sh

set -eu

: "${REDIS_PASSWORD:=peekle-redis-password}"
: "${BENCHMARK_REDIS_APPENDONLY:=yes}"
: "${BENCHMARK_REDIS_SAVE_MODE:=default}"
: "${BENCHMARK_REDIS_APPENDFSYNC:=everysec}"
: "${BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE:=100}"
: "${BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE:=64mb}"
: "${BENCHMARK_REDIS_MAXMEMORY_POLICY:=noeviction}"
: "${BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE:=yes}"
: "${BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL:=yes}"
: "${BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE:=}"
: "${BENCHMARK_REDIS_LIST_COMPRESS_DEPTH:=}"

set -- \
  redis-server \
  --requirepass "$REDIS_PASSWORD" \
  --appendonly "$BENCHMARK_REDIS_APPENDONLY" \
  --appendfsync "$BENCHMARK_REDIS_APPENDFSYNC" \
  --auto-aof-rewrite-percentage "$BENCHMARK_REDIS_AUTO_AOF_REWRITE_PERCENTAGE" \
  --auto-aof-rewrite-min-size "$BENCHMARK_REDIS_AUTO_AOF_REWRITE_MIN_SIZE" \
  --maxmemory-policy "$BENCHMARK_REDIS_MAXMEMORY_POLICY" \
  --lazyfree-lazy-expire "$BENCHMARK_REDIS_LAZYFREE_LAZY_EXPIRE" \
  --lazyfree-lazy-server-del "$BENCHMARK_REDIS_LAZYFREE_LAZY_SERVER_DEL"

if [ "$BENCHMARK_REDIS_SAVE_MODE" = "off" ]; then
  set -- "$@" --save ""
fi

if [ -n "$BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE" ]; then
  set -- "$@" --list-max-listpack-size "$BENCHMARK_REDIS_LIST_MAX_LISTPACK_SIZE"
fi

if [ -n "$BENCHMARK_REDIS_LIST_COMPRESS_DEPTH" ]; then
  set -- "$@" --list-compress-depth "$BENCHMARK_REDIS_LIST_COMPRESS_DEPTH"
fi

exec "$@"
