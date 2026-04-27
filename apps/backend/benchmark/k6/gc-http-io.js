import { Rate, Trend } from "k6/metrics";

import { startRoom, readApiResult, strictCreateStartFixtures } from "./lib/api.js";
import { buildGcHttpOptions, loadGcConfig } from "./lib/gc-config.js";
import { roomFixtureForCurrentIteration } from "./lib/gc-runtime.js";

const config = loadGcConfig();
const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");

export const options = buildGcHttpOptions(config, "httpScenario");

export function setup() {
  return strictCreateStartFixtures(config.baseUrl, config, "k6-gc-http-io");
}

export function httpScenario(data) {
  const { fixture, isMeasured } = roomFixtureForCurrentIteration(data, config);
  const response = startRoom(config.baseUrl, fixture.hostToken, fixture.roomId, {
    benchmark_scenario: "gc-http-io",
  });
  const result = readApiResult(response);

  if (isMeasured) {
    benchmarkDuration.add(response.timings.duration);
    benchmarkFailureRate.add(!result.ok);
  }
}
