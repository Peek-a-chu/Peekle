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

function rawEventData(event) {
  if (typeof event === "string") {
    return event;
  }
  if (event && typeof event.data === "string") {
    return event.data;
  }
  return "";
}

function chatPayload(roomId, senderLabel, seq) {
  const sentAt = Date.now();
  return {
    sentAt,
    message: `k6-chat|${roomId}|${senderLabel}|${seq}|${sentAt}`,
    body: JSON.stringify({
      gameId: roomId,
      message: `k6-chat|${roomId}|${senderLabel}|${seq}|${sentAt}`,
      scope: "GLOBAL",
      teamColor: null,
    }),
  };
}

function extractSentAt(body) {
  const matched = String(body).match(/k6-chat\|[^|]+\|[^|]+\|[^|]+\|(\d+)/);
  if (!matched) {
    return NaN;
  }
  return Number(matched[1]);
}

function maybeRecordChatRtt(body, metrics, shouldMeasure) {
  if (!shouldMeasure) {
    return;
  }

  try {
    let sentAt = extractSentAt(body);
    if (!Number.isFinite(sentAt)) {
      const payload = JSON.parse(body);
      const messageCandidate =
        payload?.data?.message ?? payload?.message ?? payload?.data?.content ?? null;
      sentAt = extractSentAt(messageCandidate);
    }
    if (!Number.isFinite(sentAt)) {
      return;
    }

    metrics.wsChatRtt.add(Date.now() - sentAt);
  } catch (error) {
    metrics.wsChatFailureRate.add(true);
  }
}

function attachParticipant(session, label, userId, roomId, config, metrics, shouldMeasure) {
  const ws = new WebSocket(buildSockJsWebSocketUrl(config.wsBaseUrl));
  const participant = {
    label,
    userId,
    ws,
    sendIntervalId: null,
    connected: false,
  };

  session.participants.push(participant);

  ws.onopen = () => {
    ws.send(
      encodeSockJsFrame(
        buildStompFrame("CONNECT", {
          "accept-version": "1.2",
          "heart-beat": "0,0",
          userId: String(userId),
          gameId: String(roomId),
        })
      )
    );
  };

  ws.onmessage = (event) => {
    const rawPayload = rawEventData(event);
    for (const frame of parseSockJsPayload(rawPayload)) {
      const parsed = parseStompFrame(frame);
      if (DEBUG_WS_PAYLOAD) {
        console.log(
          `[ws-frame] room=${roomId} label=${label} command=${parsed.command} destination=${parsed.headers.destination || ""} body=${parsed.body}`
        );
      }

      if (parsed.command === "CONNECTED") {
        participant.connected = true;
        ws.send(
          encodeSockJsFrame(
            buildStompFrame("SUBSCRIBE", {
              id: `sub-${label}-${roomId}`,
              destination: `/topic/games/${roomId}/chat/global`,
            })
          )
        );
        ws.send(
          encodeSockJsFrame(
            buildStompFrame("SUBSCRIBE", {
              id: `sub-error-${label}-${roomId}`,
              destination: `/topic/games/${roomId}/error/${userId}`,
            })
          )
        );

        if (session.connectedCount < session.participants.length) {
          session.connectedCount += 1;
        }

        if (!session.chatStartTimeoutId && session.connectedCount === 2) {
          session.chatStartTimeoutId = setTimeout(() => {
            for (const activeParticipant of session.participants) {
              activeParticipant.sendIntervalId = setInterval(() => {
                if (activeParticipant.ws.readyState !== WS_OPEN) {
                  return;
                }

                const payload = chatPayload(roomId, activeParticipant.label, session.nextSeq++);
                session.sentCount += 1;
                activeParticipant.ws.send(
                  encodeSockJsFrame(
                    buildStompFrame(
                      "SEND",
                      {
                        destination: "/pub/games/chat",
                        "content-type": "application/json",
                      },
                      payload.body
                    )
                  )
                );
              }, config.wsChatIntervalMs);
            }
          }, config.wsChatStartDelayMs);
        }
      } else if (parsed.command === "MESSAGE") {
        if (
          parsed.headers.destination === `/topic/games/${roomId}/error/${userId}` &&
          shouldMeasure
        ) {
          metrics.wsChatFailureRate.add(true);
          if (DEBUG_WS_PAYLOAD && !session.loggedMessage) {
            console.log(`[ws-error] room=${roomId} label=${label} body=${parsed.body}`);
            session.loggedMessage = true;
          }
          continue;
        }
        session.receivedCount += 1;
        maybeRecordChatRtt(parsed.body, metrics, shouldMeasure);
      } else if (parsed.command === "ERROR" && shouldMeasure) {
        metrics.wsChatFailureRate.add(true);
      }
    }
  };

  ws.onerror = () => {
    session.hasConnectFailure = true;
  };

  ws.onclose = () => {};
  return participant;
}

function clearTimers(session) {
  if (session.connectTimeoutId) {
    clearTimeout(session.connectTimeoutId);
    session.connectTimeoutId = null;
  }
  if (session.chatStartTimeoutId) {
    clearTimeout(session.chatStartTimeoutId);
    session.chatStartTimeoutId = null;
  }
  for (const participant of session.participants) {
    if (participant.sendIntervalId) {
      clearInterval(participant.sendIntervalId);
      participant.sendIntervalId = null;
    }
  }
}

function closeParticipants(session) {
  clearTimers(session);
  for (const participant of session.participants) {
    if (
      participant.ws.readyState === WS_OPEN ||
      participant.ws.readyState === WS_CONNECTING
    ) {
      participant.ws.close();
    }
  }
}

export function runGameChatSession(fixture, config, metrics, shouldMeasure) {
  const session = {
    participants: [],
    connectedCount: 0,
    connectTimeoutId: null,
    chatStartTimeoutId: null,
    hasConnectFailure: false,
    sentCount: 0,
    receivedCount: 0,
    nextSeq: 1,
    loggedMessage: false,
  };

  attachParticipant(
    session,
    "host",
    fixture.hostUserId,
    fixture.roomId,
    config,
    metrics,
    shouldMeasure
  );
  attachParticipant(
    session,
    "guest",
    fixture.guestUserId,
    fixture.roomId,
    config,
    metrics,
    shouldMeasure
  );

  session.connectTimeoutId = setTimeout(() => {
    if (session.connectedCount < 2) {
      session.hasConnectFailure = true;
      closeParticipants(session);
    }
  }, config.wsConnectTimeoutMs);

  setTimeout(() => closeParticipants(session), config.wsSessionMs);
  sleep((config.wsSessionMs + 300) / 1000);

  if (shouldMeasure) {
    metrics.wsConnectFailureRate.add(session.hasConnectFailure);
    metrics.wsChatFailureRate.add(
      session.hasConnectFailure || (session.sentCount > 0 && session.receivedCount === 0)
    );
  }
}
