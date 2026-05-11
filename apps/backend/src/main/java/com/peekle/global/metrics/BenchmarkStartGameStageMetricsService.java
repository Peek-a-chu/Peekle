package com.peekle.global.metrics;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;

@Component
@Profile("benchmark")
public class BenchmarkStartGameStageMetricsService {

    private static final int MAX_SAMPLES_PER_KEY = 20_000;

    private final ConcurrentMap<StageKey, Deque<Long>> samplesByKey = new ConcurrentHashMap<>();

    public void record(
            String metricName,
            long durationNanos,
            String problemSource,
            String result,
            String cacheStatus) {
        if (durationNanos <= 0) {
            return;
        }

        StageKey key = new StageKey(metricName, problemSource, result, cacheStatus);
        Deque<Long> samples = samplesByKey.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (samples) {
            if (samples.size() >= MAX_SAMPLES_PER_KEY) {
                samples.removeFirst();
            }
            samples.addLast(durationNanos);
        }
    }

    public StartGameStageSnapshot snapshot(String problemSource, String result, String cacheStatus) {
        Map<String, StageStats> stages = new TreeMap<>();

        samplesByKey.forEach((key, samples) -> {
            if (!matches(problemSource, key.problemSource())
                    || !matches(result, key.result())
                    || !matches(cacheStatus, key.cacheStatus())) {
                return;
            }

            List<Long> copiedSamples;
            synchronized (samples) {
                copiedSamples = new ArrayList<>(samples);
            }
            if (copiedSamples.isEmpty()) {
                return;
            }

            stages.put(key.metricName(), StageStats.from(copiedSamples));
        });

        return new StartGameStageSnapshot(problemSource, result, cacheStatus, stages);
    }

    private boolean matches(String requested, String actual) {
        return requested == null
                || requested.isBlank()
                || "all".equalsIgnoreCase(requested)
                || requested.equals(actual);
    }

    private record StageKey(String metricName, String problemSource, String result, String cacheStatus) {
    }

    public record StartGameStageSnapshot(
            String problemSource,
            String result,
            String cacheStatus,
            Map<String, StageStats> stages) {
    }

    public record StageStats(
            long count,
            double avgMs,
            double p50Ms,
            double p95Ms,
            double p99Ms,
            double maxMs) {

        private static StageStats from(List<Long> samples) {
            samples.sort(Comparator.naturalOrder());
            long count = samples.size();
            long totalNanos = 0L;
            for (Long sample : samples) {
                totalNanos += sample;
            }

            return new StageStats(
                    count,
                    nanosToMillis(totalNanos / (double) count),
                    nanosToMillis(percentile(samples, 0.50)),
                    nanosToMillis(percentile(samples, 0.95)),
                    nanosToMillis(percentile(samples, 0.99)),
                    nanosToMillis(samples.get(samples.size() - 1)));
        }

        private static long percentile(List<Long> sortedSamples, double percentile) {
            int index = (int) Math.ceil(percentile * sortedSamples.size()) - 1;
            int clampedIndex = Math.max(0, Math.min(index, sortedSamples.size() - 1));
            return sortedSamples.get(clampedIndex);
        }

        private static double nanosToMillis(double nanos) {
            return nanos / TimeUnit.MILLISECONDS.toNanos(1);
        }
    }
}
