import exec from "k6/execution";
import { Rate, Trend } from "k6/metrics";

import { buildOptions, loadConfig } from "./lib/config.js";
import {
  createRoom,
  createRoomRequest,
  readApiResult,
  strictCreateRoomFixtures,
} from "./lib/api.js";

const config = loadConfig();
const benchmarkDuration = new Trend("benchmark_duration", true);
const benchmarkFailureRate = new Rate("benchmark_failure_rate");

export const options = buildOptions("create_room", config);

export function setup() {
  return strictCreateRoomFixtures(config.baseUrl, config, "k6-create");
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const fixture = data.hosts[iteration];
  const response = createRoom(
    config.baseUrl,
    fixture.token,
    createRoomRequest(data.workbookId, config, fixture.title),
    { benchmark_scenario: "create-room" }
  );
  const result = readApiResult(response);

  if (iteration >= config.warmupIterations) {
    benchmarkDuration.add(response.timings.duration);
    benchmarkFailureRate.add(!result.ok);
  }
}
