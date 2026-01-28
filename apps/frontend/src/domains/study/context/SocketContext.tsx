'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

const BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';
const BROKER_URL = `${BASE_URL}/ws-stomp`;

interface SocketContextType {
  client: Client | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ client: null, connected: false });

export const useSocketContext = () => useContext(SocketContext);

interface SocketProviderProps {
  roomId: number | null;
  userId: number | null;
  children: React.ReactNode;
}

export function SocketProvider({ roomId, userId, children }: SocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  // Need to access store actions, but be careful about loops if store depends on this.
  // Ideally, subscription logic specific to "store updates" should be in the Provider
  // or a "SocketEffect" component, NOT spread across hooks if we want a single initialization.
  // HOWEVER, for now, we just want to SHARE the connection.
  // Subscription management is a separate concern.
  // Let's keep the GENERAL connection logic here.

  // We can inject store updates here IF they are global (like video token).
  // Or hooks can access the shared client to subscribe.
  // The original useSocket had subscriptions inside.
  // To avoid breaking existing hooks that expect `client` to be returned
  // and then they do `client.subscribe`, we just provide the shared client.

  // BUT: The original `useSocket` had "auto-subscribe" logic for VideoToken, Watchers, Error.
  // We should preserve that global setup in the Provider.

  const setVideoToken = useRoomStore((state) => state.setVideoToken);
  const setWatchers = useRoomStore((state) => state.setWatchers);

  useEffect(() => {
    // Wait for both parameters to start connection
    if (!roomId) return;

    // If userId is missing, we could connect as guest (0) or wait.
    // Given the requirement for "Enter" with userId, it's better to wait or use 0 explicitly if allowed.
    // Spec seems to imply userId is required for many actions.
    // Let's assume we reconnect when userId becomes available.

    // Safety check: Avoid creating multiple clients if effect re-runs without cleanup (shouldn't happen with proper cleanup)
    if (clientRef.current?.active) {
      // Ideally we trust React's cleanup.
      // But if we want to be safe against strict mode double-invoke without unmount in between (rare in prod):
      // clientRef.current.deactivate();
    }

    const uidStr = userId ? String(userId) : '1';
    console.log(`[SocketProvider] Initializing for Study ${roomId}, User ${uidStr}`);

    const client = new Client({
      webSocketFactory: () => new SockJS(BROKER_URL),
      connectHeaders: {
        userId: uidStr,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        setConnected(true);
        console.log('[SocketProvider] Connected');

        // Global Subscriptions
        if (userId) {
          // 1. Video Token
          client.subscribe(`/topic/studies/${roomId}/video-token/${userId}`, (message) => {
            try {
              const body = JSON.parse(message.body);
              if (body.type === 'VIDEO_TOKEN' && body.data) {
                setVideoToken(body.data);
              }
            } catch (e) {
              console.error(e);
            }
          });

          // 2. Watchers
          client.subscribe(`/topic/studies/rooms/${roomId}/ide/${userId}/watchers`, (message) => {
            try {
              const body = JSON.parse(message.body);
              if (body && body.data) {
                const { count, viewers } = body.data;
                setWatchers(count || 0, viewers || []);
              }
            } catch (e) {
              console.error(e);
            }
          });

          // 3. Error
          client.subscribe(`/topic/studies/rooms/${roomId}/error/${userId}`, (message) => {
            try {
              const body = JSON.parse(message.body);
              if (body && body.error) {
                console.error('[STOMP] Error Notification:', body.error);
              }
            } catch (e) {
              console.error(e);
            }
          });

          // 4. Auto-Enter
          client.publish({
            destination: '/pub/studies/enter',
            body: JSON.stringify({ studyId: roomId, userId: String(userId) }),
          });
        }
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
      },
      onDisconnect: () => {
        setConnected(false);
        console.log('[SocketProvider] Disconnected');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      console.log('[SocketProvider] Cleanup/Disconnecting...');
      if (clientRef.current) {
        const activeClient = clientRef.current;
        if (activeClient.connected && roomId && userId) {
          try {
            activeClient.publish({
              destination: '/pub/studies/leave',
              body: JSON.stringify({ studyId: roomId, userId: String(userId) }),
            });
          } catch (e) {}
        }
        activeClient.deactivate().catch((err) => console.error(err));
        clientRef.current = null;
        setConnected(false);
      }
    };
  }, [roomId, userId, setVideoToken, setWatchers]);

  return (
    <SocketContext.Provider value={{ client: clientRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
