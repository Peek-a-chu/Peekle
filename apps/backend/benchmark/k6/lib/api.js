import http from "k6/http";

function buildHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["X-Peekle-Token"] = token;
  }

  return headers;
}

function benchmarkSetupParams() {
  return {
    headers: buildHeaders(),
    timeout: __ENV.SETUP_REQUEST_TIMEOUT || __ENV.SETUP_TIMEOUT || "30m",
  };
}

function parsePayload(response, contextLabel) {
  try {
    return response.json();
  } catch (error) {
    throw new Error(`${contextLabel} returned non-JSON response: ${response.body}`);
  }
}

function expectSuccess(response, contextLabel) {
  const payload = parsePayload(response, contextLabel);
  if (response.status >= 400 || payload.success !== true) {
    throw new Error(
      `${contextLabel} failed: status=${response.status}, body=${JSON.stringify(payload)}`
    );
  }
  return payload.data;
}

function uniqueSuffix(index) {
  return `${Date.now()}-${index}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function createDevUser(baseUrl, prefix, index) {
  const nickname = `${prefix}-${uniqueSuffix(index)}`;
  const response = http.post(
    `${baseUrl}/api/dev/users?nickname=${encodeURIComponent(nickname)}`,
    null,
    { headers: buildHeaders() }
  );
  if (response.status >= 400) {
    throw new Error(`createDevUser failed: status=${response.status}, body=${response.body}`);
  }
  return parsePayload(response, "createDevUser");
}

export function ensureProblems(baseUrl, count) {
  const response = http.post(
    `${baseUrl}/api/benchmark/problems/ensure?count=${count}`,
    null,
    { headers: buildHeaders() }
  );
  return expectSuccess(response, "ensureProblems");
}

export function createWorkbook(baseUrl, token, title, problemIds) {
  const response = http.post(
    `${baseUrl}/api/workbooks/new`,
    JSON.stringify({
      title,
      description: `Workbook benchmark fixture for ${title}`,
      problemIds,
    }),
    { headers: buildHeaders(token) }
  );
  return expectSuccess(response, "createWorkbook");
}

export function createRoomRequest(workbookId, config, title) {
  return {
    title,
    maxPlayers: config.maxPlayers,
    timeLimit: config.timeLimitMinutes,
    problemCount: config.problemCount,
    teamType: "INDIVIDUAL",
    mode: "TIME_ATTACK",
    problemSource: "WORKBOOK",
    selectedWorkbookId: String(workbookId),
  };
}

export function createRoom(baseUrl, token, requestBody, tags = {}) {
  return http.post(`${baseUrl}/api/games`, JSON.stringify(requestBody), {
    headers: buildHeaders(token),
    tags,
  });
}

export function strictCreateRoom(baseUrl, token, requestBody) {
  const response = createRoom(baseUrl, token, requestBody);
  return expectSuccess(response, "createRoom");
}

export function enterRoom(baseUrl, token, roomId) {
  const response = http.post(
    `${baseUrl}/api/games/${roomId}/enter`,
    JSON.stringify({}),
    { headers: buildHeaders(token) }
  );
  return expectSuccess(response, "enterRoom");
}

export function readyRoom(baseUrl, token, roomId, tags = {}) {
  return http.post(`${baseUrl}/api/benchmark/games/${roomId}/ready`, null, {
    headers: buildHeaders(token),
    tags,
  });
}

export function strictReadyRoom(baseUrl, token, roomId) {
  const response = readyRoom(baseUrl, token, roomId);
  return expectSuccess(response, "readyRoom");
}

export function startRoom(baseUrl, token, roomId, tags = {}) {
  return http.post(`${baseUrl}/api/benchmark/games/${roomId}/start`, null, {
    headers: buildHeaders(token),
    tags,
  });
}

export function evictPreview(baseUrl, roomId) {
  const response = http.del(`${baseUrl}/api/benchmark/games/${roomId}/preview`, null, {
    headers: buildHeaders(),
  });
  return expectSuccess(response, "evictPreview");
}

export function strictCreateStartFixtures(baseUrl, config, prefix) {
  const response = http.post(
    `${baseUrl}/api/benchmark/fixtures/start`,
    JSON.stringify({
      datasetSize: config.datasetSize,
      totalIterations: config.totalIterations,
      problemCount: config.problemCount,
      maxPlayers: config.maxPlayers,
      timeLimitMinutes: config.timeLimitMinutes,
      prefix,
    }),
    benchmarkSetupParams()
  );
  return expectSuccess(response, "createStartFixtures");
}

export function strictCreateRoomFixtures(baseUrl, config, prefix) {
  const response = http.post(
    `${baseUrl}/api/benchmark/fixtures/create-room`,
    JSON.stringify({
      datasetSize: config.datasetSize,
      totalIterations: config.totalIterations,
      problemCount: config.problemCount,
      maxPlayers: config.maxPlayers,
      timeLimitMinutes: config.timeLimitMinutes,
      prefix,
    }),
    benchmarkSetupParams()
  );
  return expectSuccess(response, "createCreateRoomFixtures");
}

export function strictCreateFinishRaceFixtures(baseUrl, roomCount, prefix) {
  const response = http.post(
    `${baseUrl}/api/benchmark/fixtures/finish-race`,
    JSON.stringify({
      roomCount,
      prefix,
    }),
    benchmarkSetupParams()
  );
  return expectSuccess(response, "createFinishRaceFixtures");
}

export function endRoom(baseUrl, roomId, tags = {}) {
  return http.post(`${baseUrl}/api/games/${roomId}/end`, null, {
    headers: buildHeaders(),
    tags,
  });
}

export function readApiResult(response) {
  try {
    const payload = response.json();
    return {
      ok: response.status < 400 && payload.success === true,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      payload: null,
    };
  }
}
