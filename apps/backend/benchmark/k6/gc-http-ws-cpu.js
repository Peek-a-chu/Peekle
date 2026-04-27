import { sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

import {
  evictPreview,
  readApiResult,
  startRoom,
  strictCreateStartFixtures,
} from "./lib/api.js";
import { buildGcMixedOptions, loadGcConfig } from "./lib/gc-config.js";
import { runGameChatSession } from "./lib/game-chat-session.js";
import { roomFixtureForCurrentIteration } from "./lib/gc-runtime.js";

const config = loadGcConfig();
const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");
const wsChatRtt = new Trend("ws_chat_rtt", true);
const wsChatFailureRate = new Rate("ws_chat_failure_rate");
const wsConnectFailureRate = new Rate("ws_connect_failure_rate");

const wsMetrics = {
  wsChatRtt,
  wsChatFailureRate,
  wsConnectFailureRate,
};

export const options = buildGcMixedOptions(config);

export function setup() {
  return strictCreateStartFixtures(config.baseUrl, config, "k6-gc-http-ws-cpu");
}

export function httpScenario(data) {
  const startedAt = Date.now();
  const { fixture, isMeasured } = roomFixtureForCurrentIteration(data, config);

  sleep(config.httpStartDelayMs / 1000);

  let failed = false;
  try {
    evictPreview(config.baseUrl, fixture.roomId);
  } catch (error) {
    failed = true;
  }

  const response = startRoom(config.baseUrl, fixture.hostToken, fixture.roomId, {
    benchmark_scenario: "gc-http-ws-cpu",
  });
  const result = readApiResult(response);

  if (isMeasured) {
    benchmarkDuration.add(response.timings.duration);
    benchmarkFailureRate.add(failed || !result.ok);
  }

  const remainingMs = config.wsSessionMs - (Date.now() - startedAt);
  if (remainingMs > 0) {
    sleep(remainingMs / 1000);
  }
}

export function wsScenario(data) {
  const { fixture, isMeasured } = roomFixtureForCurrentIteration(data, config);
  runGameChatSession(fixture, config, wsMetrics, isMeasured);
}
