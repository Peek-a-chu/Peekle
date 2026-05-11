import { Rate, Trend } from "k6/metrics";

import { strictCreateStartFixtures } from "./lib/api.js";
import { buildGcWsOptions, loadGcConfig } from "./lib/gc-config.js";
import { runGameChatSession } from "./lib/game-chat-session.js";
import { roomFixtureForCurrentIteration } from "./lib/gc-runtime.js";

const config = loadGcConfig();
const wsChatRtt = new Trend("ws_chat_rtt", true);
const wsChatFailureRate = new Rate("ws_chat_failure_rate");
const wsConnectFailureRate = new Rate("ws_connect_failure_rate");

const wsMetrics = {
  wsChatRtt,
  wsChatFailureRate,
  wsConnectFailureRate,
};

export const options = buildGcWsOptions(config);

export function setup() {
  return strictCreateStartFixtures(config.baseUrl, config, "k6-gc-ws-cpu");
}

export function wsScenario(data) {
  const { fixture, isMeasured } = roomFixtureForCurrentIteration(data, config);
  runGameChatSession(fixture, config, wsMetrics, isMeasured);
}
