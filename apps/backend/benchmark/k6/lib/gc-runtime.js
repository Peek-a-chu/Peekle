import exec from "k6/execution";

export function roomFixtureForCurrentIteration(data, config) {
  const scenarioIteration = exec.scenario.iterationInTest;
  const index =
    Number.isFinite(scenarioIteration) && scenarioIteration >= 0
      ? scenarioIteration
      : (exec.vu.idInTest - 1) * config.iterationsPerVu + exec.vu.iterationInScenario;
  const fixture = data.rooms[index];

  if (!fixture) {
    throw new Error(`Missing room fixture for scenarioIteration=${scenarioIteration}`);
  }

  return {
    fixture,
    index,
    isMeasured: index >= config.warmupIterations,
  };
}
