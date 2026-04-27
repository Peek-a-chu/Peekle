function randomBase36(length) {
  return Math.random().toString(36).slice(2, 2 + length);
}

export function buildSockJsWebSocketUrl(wsBaseUrl) {
  const serverId = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const sessionId = `${randomBase36(8)}${Date.now().toString(36)}`;
  return `${wsBaseUrl}/ws-stomp/${serverId}/${sessionId}/websocket`;
}

export function encodeSockJsFrame(stompFrame) {
  return JSON.stringify([stompFrame]);
}

export function buildStompFrame(command, headers = {}, body = "") {
  const lines = [command];

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    lines.push(`${key}:${value}`);
  }

  lines.push("");
  lines.push(body);
  return `${lines.join("\n")}\u0000`;
}

export function parseSockJsPayload(rawPayload) {
  if (!rawPayload || rawPayload === "o" || rawPayload === "h") {
    return [];
  }

  if (!rawPayload.startsWith("a")) {
    return [];
  }

  try {
    return JSON.parse(rawPayload.slice(1));
  } catch (error) {
    return [];
  }
}

export function parseStompFrame(rawFrame) {
  const frameWithoutNull = rawFrame.endsWith("\u0000")
    ? rawFrame.slice(0, -1)
    : rawFrame;
  const normalized = frameWithoutNull.replace(/\r\n/g, "\n");
  const bodyDelimiterIndex = normalized.indexOf("\n\n");
  const headerSection =
    bodyDelimiterIndex >= 0 ? normalized.slice(0, bodyDelimiterIndex) : normalized;
  const body = bodyDelimiterIndex >= 0 ? normalized.slice(bodyDelimiterIndex + 2) : "";
  const headerLines = headerSection.split("\n");
  const command = (headerLines.shift() || "").trim();
  const headers = {};

  for (const line of headerLines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }
    headers[line.slice(0, separatorIndex).trim()] = line
      .slice(separatorIndex + 1)
      .trim();
  }

  return {
    command,
    headers,
    body,
  };
}
