import exec from "k6/execution";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";
import { sleep } from "k6";

import { strictCreateWhiteboardFixtures } from "./lib/api.js";
import { loadWhiteboardConfig, buildWhiteboardOptions } from "./lib/wb-config.js";

const config = loadWhiteboardConfig();

const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");
const whiteboardEventRtt = new Trend("whiteboard_event_rtt", true);
const whiteboardSyncRtt = new Trend("whiteboard_sync_rtt", true);
const whiteboardConnectFailureRate = new Rate("whiteboard_connect_failure_rate");
const whiteboardEventFailureRate = new Rate("whiteboard_event_failure_rate");
const whiteboardConsistencyFailureRate = new Rate(
  "whiteboard_consistency_failure_rate"
);

export const options = buildWhiteboardOptions(config);

export function setup() {
  return strictCreateWhiteboardFixtures(
    config.baseUrl,
    config,
    "k6-whiteboard-sync"
  );
}

function fixtureForCurrentIteration(data) {
  const scenarioIteration = exec.scenario.iterationInTest;
  const index = Number.isFinite(scenarioIteration) ? scenarioIteration : 0;
  const fixture = data.studies[index];

  if (!fixture) {
    throw new Error(`Missing whiteboard fixture for iteration index=${index}`);
  }

  return {
    fixture,
    isMeasured: index >= config.warmupIterations,
  };
}

function postJson(url, body) {
  return http.post(url, JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isSuccessfulResponse(response) {
  if (!response) {
    return false;
  }

  const status = Number(response.status || 0);
  if (status < 200 || status >= 400) {
    return false;
  }

  return !response.error && !response.error_code;
}

function requestSync(fixture, reason, shouldMeasure) {
  const clientSentAt = Date.now();
  const response = postJson(`${config.baseUrl}/api/benchmark/whiteboard/sync`, {
    studyId: fixture.studyId,
    userId: fixture.peerUserId,
    clientSentAt,
    reason,
  });
  if (shouldMeasure && isSuccessfulResponse(response)) {
    whiteboardSyncRtt.add(response.timings.duration);
  }
  return isSuccessfulResponse(response);
}

function publishEvent(fixture, sequence, shouldMeasure) {
  const clientSentAt = Date.now();
  const response = postJson(`${config.baseUrl}/api/benchmark/whiteboard/event`, {
    studyId: fixture.studyId,
    userId: fixture.ownerUserId,
    sequence,
    clientSentAt,
  });
  if (shouldMeasure && isSuccessfulResponse(response)) {
    whiteboardEventRtt.add(response.timings.duration);
  }
  return isSuccessfulResponse(response);
}

export default function (data) {
  const { fixture, isMeasured } = fixtureForCurrentIteration(data);
  const startedAt = Date.now();

  let failed = false;
  whiteboardConnectFailureRate.add(false);

  if (!requestSync(fixture, "initial", isMeasured)) {
    failed = true;
  }

  for (let sequence = 1; sequence <= config.eventsPerSession; sequence += 1) {
    if (!publishEvent(fixture, sequence, isMeasured)) {
      failed = true;
    }
    sleep(config.sendIntervalMs / 1000);
  }

  if (!requestSync(fixture, "final", isMeasured)) {
    failed = true;
  }

  if (isMeasured) {
    benchmarkDuration.add(Date.now() - startedAt);
    benchmarkFailureRate.add(failed);
    whiteboardEventFailureRate.add(failed);
    whiteboardConsistencyFailureRate.add(failed);
  }
}
