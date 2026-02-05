'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/auth-store';

interface SocketContextType {
  client: Client | null;
  connected: boolean;
}

export const SocketContext = createContext<SocketContextType>({
  client: null,
  connected: false,
});

export const useSocketContext = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
  roomId: string | number;
  userId: number;
}

export function SocketProvider({ children, roomId, userId }: SocketProviderProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [client, setClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = React.useRef<Client | null>(null);
  const connectKeyRef = React.useRef<string>('');
  const generationRef = React.useRef(0);
  const shutdownRef = React.useRef<Promise<void> | null>(null);
  const reconnectAttemptRef = React.useRef(0);
  const reconnectTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Don't connect until we have a valid identity.
      // Connecting with userId=0 can trigger reconnect loops and "infinite" WS sessions.
      if (!roomId || !userId || String(userId) === 'null' || String(userId) === 'undefined') {
        if (clientRef.current) {
          const old = clientRef.current;
          clientRef.current = null;
          connectKeyRef.current = '';
          generationRef.current += 1;
          shutdownRef.current = old.deactivate();
          await shutdownRef.current.catch(() => undefined);
          shutdownRef.current = null;
          if (!cancelled) {
            setClient(null);
            setConnected(false);
          }
        }
        return;
      }

      // 백엔드 SockJS 엔드포인트
      // Nginx를 사용하는 HTTPS 환경에서는 https://로 시작하는 URL이 주입됩니다.
      // NEXT_PUBLIC_SOCKET_URL은 도메인 루트(https://...)를 가리켜야 합니다.
      const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://localhost';

      // sockjs-client는 상대경로(/ws-stomp) 또는 절대경로(https://...) 모두 지원합니다.
      // Nginx에서 /ws-stomp 경로를 백엔드로 라우팅하고 있으므로, /api/ws-stomp가 아닌 /ws-stomp를 사용해야 합니다.
      // 따라서 NEXT_PUBLIC_API_URL(/api 포함) 대신 NEXT_PUBLIC_SOCKET_URL(도메인만)을 사용합니다.
      const socketUrl = `${baseUrl}/ws-stomp`;

      const connectKey = `${socketUrl}|${String(roomId)}|${String(userId)}`;

      // If we already have an active client for the same (url, roomId, userId), do nothing.
      if (clientRef.current && connectKeyRef.current === connectKey) {
        return;
      }

      // If we have a different client, deactivate it first (and wait).
      if (clientRef.current) {
        const old = clientRef.current;
        clientRef.current = null;
        connectKeyRef.current = '';
        generationRef.current += 1;
        shutdownRef.current = old.deactivate();
        await shutdownRef.current.catch(() => undefined);
        shutdownRef.current = null;
        if (!cancelled) {
          setClient(null);
          setConnected(false);
        }
      }

      const myGen = (generationRef.current += 1);

      console.log(`[SocketProvider] Connecting to ${socketUrl} (Room: ${roomId}, User: ${userId})`);

      const stompClient = new Client({
        // SockJS를 팩토리로 주입하여 STOMP 클라이언트 생성
        webSocketFactory: () => new SockJS(socketUrl),

        connectHeaders: {
          userId: String(userId),
          studyId: String(roomId),
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
        },
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[STOMP]', str);
          }
        },
        // IMPORTANT:
        // Disable built-in reconnect. When the server closes early (or during rapid toggles),
        // stompjs can spin up endless SockJS sessions via reconnectDelay.
        // We'll do our own capped/backoff reconnect below.
        reconnectDelay: 0,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.onConnect = (frame) => {
        // Guard against late connects from an old generation (race during toggles)
        if (generationRef.current !== myGen) {
          void stompClient.deactivate();
          return;
        }
        console.log('[STOMP] Connected');
        reconnectAttemptRef.current = 0;
        setConnected(true);
      };

      stompClient.onStompError = (frame) => {
        console.error('[STOMP] Broker error:', frame.headers['message']);
        console.error('[STOMP] Details:', frame.body);
      };

      stompClient.onWebSocketClose = () => {
        console.log('[STOMP] Connection closed');
        setConnected(false);

        // Clear current client so `run()` will actually reconnect.
        if (clientRef.current === stompClient) {
          clientRef.current = null;
          connectKeyRef.current = '';
          setClient(null);
        }

        // Capped reconnect with backoff
        if (cancelled) return;
        const maxAttempts = 8;
        if (reconnectAttemptRef.current >= maxAttempts) {
          console.warn('[STOMP] Reconnect attempts exceeded. Stop reconnecting.');
          return;
        }
        reconnectAttemptRef.current += 1;
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptRef.current - 1));
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          if (!cancelled) void run();
        }, delay);
      };

      // Before activating, ensure we're still the latest run
      if (cancelled || generationRef.current !== myGen) {
        void stompClient.deactivate();
        return;
      }

      clientRef.current = stompClient;
      connectKeyRef.current = connectKey;
      stompClient.activate();
      setClient(stompClient);
    };

    void run();

    return () => {
      cancelled = true;
      console.log('[STOMP] Disconnecting...');
      generationRef.current += 1;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const current = clientRef.current;
      clientRef.current = null;
      connectKeyRef.current = '';
      if (current) {
        shutdownRef.current = current.deactivate();
      }
      setConnected(false);
    };
  }, [roomId, userId]);

  return <SocketContext.Provider value={{ client, connected }}>{children}</SocketContext.Provider>;
}
