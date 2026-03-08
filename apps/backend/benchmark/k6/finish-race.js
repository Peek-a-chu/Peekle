import exec from "k6/execution";
import { Rate, Trend } from "k6/metrics";

import { buildOptions, loadConfig } from "./lib/config.js";
import { endRoom, readApiResult, strictCreateFinishRaceFixtures } from "./lib/api.js";

const config = loadConfig();
const fanoutSize = Number(__ENV.FANOUT_SIZE || config.concurrency);

if (!Number.isInteger(fanoutSize) || fanoutSize <= 0) {
  throw new Error("FANOUT_SIZE must be a positive integer");
}

if (config.warmupIterations % fanoutSize !== 0) {
  throw new Error("WARMUP_ITERATIONS must be a multiple of FANOUT_SIZE");
}

if (config.measureIterations % fanoutSize !== 0) {
  throw new Error("MEASURE_ITERATIONS must be a multiple of FANOUT_SIZE");
}

const totalRooms = config.totalIterations / fanoutSize;
if (!Number.isInteger(totalRooms) || totalRooms <= 0) {
  throw new Error("Total room count must be a positive integer");
}

const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");

export const options = buildOptions("finish_race", config);

export function setup() {
  return strictCreateFinishRaceFixtures(config.baseUrl, totalRooms, "k6-finish-race");
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const roomIndex = Math.floor(iteration / fanoutSize);
  const fixture = data.rooms[roomIndex];
  const response = endRoom(config.baseUrl, fixture.roomId, {
    benchmark_scenario: "finish-race",
  });
  const result = readApiResult(response);

  if (iteration >= config.warmupIterations) {
    benchmarkDuration.add(response.timings.duration);
    benchmarkFailureRate.add(!result.ok);
  }
}
