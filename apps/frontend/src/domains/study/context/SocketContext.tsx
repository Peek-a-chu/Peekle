'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface SocketContextType {
  client: Client | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
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
  const [client, setClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = React.useRef<Client | null>(null);
  const connectKeyRef = React.useRef<string>('');
  const generationRef = React.useRef(0);
  const shutdownRef = React.useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Don't connect until we have a valid identity.
      // Connecting with userId=0 can trigger reconnect loops and "infinite" WS sessions.
      if (!roomId || !userId) {
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

      // 백엔드 SockJS 엔드포인트 (http 프로토콜 사용)
      let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

    // 로컬 개발 환경에서 https로 설정된 경우 http로 강제 변환 (SSL 연결 오류 방지)
    if (
      baseUrl.startsWith('https://') &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))
    ) {
      baseUrl = baseUrl.replace('https://', 'http://');
    }

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
        },
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[STOMP]', str);
          }
        },
        reconnectDelay: 5000,
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
        setConnected(true);
      };

    stompClient.onStompError = (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message']);
      console.error('[STOMP] Details:', frame.body);
    };

      stompClient.onWebSocketClose = () => {
        console.log('[STOMP] Connection closed');
        setConnected(false);
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
