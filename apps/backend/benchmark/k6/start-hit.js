import exec from "k6/execution";
import { Rate, Trend } from "k6/metrics";

import { buildOptions, loadConfig } from "./lib/config.js";
import { readApiResult, startRoom, strictCreateStartFixtures } from "./lib/api.js";

const config = loadConfig();
const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");

export const options = buildOptions("start_hit", config);

export function setup() {
  return strictCreateStartFixtures(config.baseUrl, config, "k6-start-hit");
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const fixture = data.rooms[iteration];
  const response = startRoom(config.baseUrl, fixture.hostToken, fixture.roomId, {
    benchmark_scenario: "start-hit",
  });
  const result = readApiResult(response);

  if (iteration >= config.warmupIterations) {
    benchmarkDuration.add(response.timings.duration);
    benchmarkFailureRate.add(!result.ok);
  }
}
