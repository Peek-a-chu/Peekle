import { sleep } from "k6";
import { WebSocket } from "k6/websockets";

import {
  buildSockJsWebSocketUrl,
  buildStompFrame,
  encodeSockJsFrame,
  parseSockJsPayload,
  parseStompFrame,
} from "./sockjs-stomp.js";

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const DEBUG_WS_PAYLOAD = __ENV.DEBUG_WS_PAYLOAD === "1";
const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

function rawEventData(event) {
  if (typeof event === "string") {
    return event;
  }
  if (event && typeof event.data === "string") {
    return event.data;
  }
  if (event && event.data instanceof ArrayBuffer && textDecoder) {
    return textDecoder.decode(new Uint8Array(event.data));
  }
  if (event instanceof ArrayBuffer && textDecoder) {
    return textDecoder.decode(new Uint8Array(event));
  }
  return "";
}

function whiteboardTopic(studyId) {
  return `/topic/studies/rooms/${studyId}/whiteboard`;
}

function whiteboardUserTopic(studyId, userId) {
  return `/topic/studies/rooms/${studyId}/whiteboard/${userId}`;
}

function rectPayload(studyId, senderUserId, sequence, sentAt, objectId) {
  return {
    id: objectId,
    type: "rect",
    version: "5.3.0",
    originX: "left",
    originY: "top",
    left: 48 + sequence * 14,
    top: 48 + sequence * 12,
    width: 42,
    height: 30,
    fill: "transparent",
    stroke: "#2563eb",
    strokeWidth: 2,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    visible: true,
    backgroundColor: "",
    fillRule: "nonzero",
    paintFirst: "fill",
    globalCompositeOperation: "source-over",
    skewX: 0,
    skewY: 0,
    rx: 0,
    ry: 0,
    bench: {
      studyId,
      senderUserId,
      sequence,
      sentAt,
    },
  };
}

function createAddEvent(studyId, senderUserId, sequence) {
  const sentAt = Date.now();
  const objectId = `wb-k6-${studyId}-${senderUserId}-${sequence}-${sentAt}`;
  return {
    objectId,
    sentAt,
    body: JSON.stringify({
      action: "ADDED",
      objectId,
      data: rectPayload(studyId, senderUserId, sequence, sentAt, objectId),
    }),
  };
}

function closeParticipants(session) {
  if (session.connectTimeoutId) {
    clearTimeout(session.connectTimeoutId);
    session.connectTimeoutId = null;
  }
  if (session.sessionTimeoutId) {
    clearTimeout(session.sessionTimeoutId);
    session.sessionTimeoutId = null;
  }
  if (session.sendIntervalId) {
    clearInterval(session.sendIntervalId);
    session.sendIntervalId = null;
  }

  for (const participant of [session.sender, session.observer]) {
    if (!participant || !participant.ws) {
      continue;
    }
    if (
      participant.ws.readyState === WS_OPEN ||
      participant.ws.readyState === WS_CONNECTING
    ) {
      participant.ws.close();
    }
  }
}

function requestSync(session, reason) {
  if (!session.observer || !session.observer.ws || session.observer.ws.readyState !== WS_OPEN) {
    return;
  }
  session.pendingSync = {
    startedAt: Date.now(),
    reason,
  };
  session.observer.ws.send(
    encodeSockJsFrame(
      buildStompFrame(
        "SEND",
        {
          destination: "/pub/studies/whiteboard/message",
          "content-type": "application/json",
          studyId: String(session.fixture.studyId),
        },
        JSON.stringify({
          action: "SYNC",
          data: {
            bench: {
              sentAt: Date.now(),
              reason,
            },
          },
        })
      )
    )
  );
}

function maybeStartSending(session) {
  if (session.sendIntervalId || session.hasConnectFailure) {
    return;
  }

  if (!session.sender || !session.sender.ws || session.sender.ws.readyState !== WS_OPEN) {
    return;
  }

  session.expectedFinalRevision = session.legacySyncMode
    ? null
    : session.baselineRevision + session.config.eventsPerSession;
  let sequence = 0;
  session.sendIntervalId = setInterval(() => {
    if (!session.sender || session.sender.ws.readyState !== WS_OPEN) {
      return;
    }

    if (sequence >= session.config.eventsPerSession) {
      clearInterval(session.sendIntervalId);
      session.sendIntervalId = null;
      session.finalSyncRequested = true;
      setTimeout(() => requestSync(session, "final"), 150);
      setTimeout(() => closeParticipants(session), 450);
      return;
    }

    const event = createAddEvent(
      session.fixture.studyId,
      session.fixture.ownerUserId,
      sequence + 1
    );
    session.pendingEvents[event.objectId] = event.sentAt;
    session.sender.ws.send(
      encodeSockJsFrame(
        buildStompFrame(
          "SEND",
          {
            destination: "/pub/studies/whiteboard/message",
            "content-type": "application/json",
            studyId: String(session.fixture.studyId),
          },
          event.body
        )
      )
    );
    sequence += 1;
    session.sentEventCount = sequence;
  }, session.config.sendIntervalMs);
}

function maybeStartScenario(session) {
  if (session.scenarioStarted || session.connectedCount < 2 || session.hasConnectFailure) {
    return;
  }

  session.scenarioStarted = true;
  requestSync(session, "initial");
  setTimeout(() => maybeStartSending(session), 150);
}

function handleSyncMessage(session, payload, metrics, shouldMeasure) {
  if (shouldMeasure && session.pendingSync) {
    metrics.whiteboardSyncRtt.add(Date.now() - session.pendingSync.startedAt);
  }

  const revision = Number(
    payload?.revision ?? payload?.data?.revision ?? payload?.data?.stateData?.revision ?? 0
  );
  const historyLength = Array.isArray(payload?.data?.history)
    ? payload.data.history.length
    : 0;

  if (!session.initialSyncDone) {
    session.baselineRevision = session.legacySyncMode
      ? session.fixture.seededRevision
      : revision;
    session.initialHistoryLength = historyLength;
    session.initialSyncDone = true;
    session.pendingSync = null;
    return;
  }

  if (session.finalSyncRequested) {
    session.finalSyncDone = true;
    session.finalRevision = session.legacySyncMode
      ? session.fixture.seededRevision
      : revision;
    session.finalHistoryLength = historyLength;
    session.pendingSync = null;
    closeParticipants(session);
  }
}

function handleBroadcastMessage(session, payload, metrics, shouldMeasure) {
  if (!payload || payload.action !== "ADDED" || !payload.objectId) {
    return;
  }

  const sentAt = session.pendingEvents[payload.objectId];
  if (!sentAt) {
    return;
  }

  if (shouldMeasure) {
    metrics.whiteboardEventRtt.add(Date.now() - sentAt);
  }

  delete session.pendingEvents[payload.objectId];
  session.receivedEventCount += 1;
  if (!session.legacySyncMode) {
    session.lastObservedRevision = Math.max(
      session.lastObservedRevision,
      Number(payload.revision || 0)
    );
  }
}

function subscribeFrame(id, destination) {
  return encodeSockJsFrame(
    buildStompFrame("SUBSCRIBE", {
      id,
      destination,
    })
  );
}

function connectFrame(userId, studyId) {
  return encodeSockJsFrame(
    buildStompFrame("CONNECT", {
      "accept-version": "1.2",
      "heart-beat": "0,0",
      userId: String(userId),
      studyId: String(studyId),
    })
  );
}

function attachParticipant(session, role, userId, isObserver, metrics, shouldMeasure) {
  const ws = new WebSocket(buildSockJsWebSocketUrl(session.config.wsBaseUrl));
  const participant = {
    role,
    userId,
    ws,
    connected: false,
  };

  if (isObserver) {
    session.observer = participant;
  } else {
    session.sender = participant;
  }

  const handleOpen = () => {
    session.connectedCount += 1;
    ws.send(connectFrame(userId, session.fixture.studyId));
    setTimeout(() => {
      if (ws.readyState !== WS_OPEN) {
        return;
      }
      ws.send(
        subscribeFrame(
          `sub-topic-${role}-${session.fixture.studyId}`,
          whiteboardTopic(session.fixture.studyId)
        )
      );
      ws.send(
        subscribeFrame(
          `sub-user-${role}-${session.fixture.studyId}`,
          whiteboardUserTopic(session.fixture.studyId, userId)
        )
      );
      maybeStartScenario(session);
    }, 10);
  };

  const handleMessage = (event) => {
    const rawPayload = rawEventData(event);
    if (DEBUG_WS_PAYLOAD) {
      console.log(
        `[wb-ws-raw] study=${session.fixture.studyId} role=${role} raw=${JSON.stringify(
          rawPayload
        )}`
      );
    }
    for (const frame of parseSockJsPayload(rawPayload)) {
      const parsed = parseStompFrame(frame);
      if (DEBUG_WS_PAYLOAD) {
        console.log(
          `[wb-ws-frame] study=${session.fixture.studyId} role=${role} command=${parsed.command} destination=${parsed.headers.destination || ""} body=${parsed.body}`
        );
      }

      if (parsed.command === "CONNECTED") {
        participant.connected = true;
        continue;
      }

      if (parsed.command !== "MESSAGE") {
        if (parsed.command === "ERROR") {
          session.hasEventFailure = true;
        }
        continue;
      }

      let payload = null;
      try {
        payload = JSON.parse(parsed.body);
      } catch (error) {
        session.hasEventFailure = true;
        continue;
      }

      if (parsed.headers.destination === whiteboardUserTopic(session.fixture.studyId, userId)) {
        handleSyncMessage(session, payload, metrics, shouldMeasure);
      } else if (parsed.headers.destination === whiteboardTopic(session.fixture.studyId)) {
        if (isObserver) {
          handleBroadcastMessage(session, payload, metrics, shouldMeasure);
        }
      }
    }
  };

  const handleError = () => {
    session.hasConnectFailure = true;
  };

  if (typeof ws.addEventListener === "function") {
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", handleError);
  } else {
    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onerror = handleError;
  }
}

export function runWhiteboardSession(fixture, config, metrics, shouldMeasure) {
  const session = {
    fixture,
    config,
    legacySyncMode: config.syncMode === "legacy" || fixture.syncMode === "legacy",
    scenarioStarted: false,
    sender: null,
    observer: null,
    connectedCount: 0,
    connectTimeoutId: null,
    sessionTimeoutId: null,
    sendIntervalId: null,
    pendingSync: null,
    pendingEvents: {},
    baselineRevision: fixture.seededRevision,
    expectedFinalRevision: null,
    initialHistoryLength: fixture.seededObjectCount,
    finalHistoryLength: 0,
    initialSyncDone: false,
    finalSyncRequested: false,
    finalSyncDone: false,
    finalRevision: 0,
    lastObservedRevision: fixture.seededRevision,
    sentEventCount: 0,
    receivedEventCount: 0,
    hasConnectFailure: false,
    hasEventFailure: false,
    startedAt: Date.now(),
  };

  attachParticipant(
    session,
    "sender",
    fixture.ownerUserId,
    false,
    metrics,
    shouldMeasure
  );
  attachParticipant(
    session,
    "observer",
    fixture.peerUserId,
    true,
    metrics,
    shouldMeasure
  );

  session.connectTimeoutId = setTimeout(() => {
    if (session.connectedCount < 2) {
      session.hasConnectFailure = true;
      closeParticipants(session);
    }
  }, config.wsConnectTimeoutMs);

  session.sessionTimeoutId = setTimeout(() => {
    closeParticipants(session);
  }, config.wsSessionTimeoutMs);

  sleep((config.wsSessionTimeoutMs + 300) / 1000);

  if (!shouldMeasure) {
    return;
  }

  const pendingEventCount = Object.keys(session.pendingEvents).length;
  const eventFailure =
    session.hasConnectFailure ||
    session.hasEventFailure ||
    pendingEventCount > 0 ||
    session.sentEventCount < config.eventsPerSession;
  const consistencyFailure = eventFailure;

  metrics.benchmarkDuration.add(Date.now() - session.startedAt);
  metrics.benchmarkFailureRate.add(eventFailure || consistencyFailure);
  metrics.whiteboardConnectFailureRate.add(session.hasConnectFailure);
  metrics.whiteboardEventFailureRate.add(eventFailure);
  metrics.whiteboardConsistencyFailureRate.add(consistencyFailure);
}
