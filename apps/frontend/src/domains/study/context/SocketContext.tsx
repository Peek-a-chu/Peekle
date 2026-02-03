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
      // NEXT_PUBLIC_API_URL이 https://localhost (Nginx) 를 가리키기 때문에 이를 그대로 사용해야 합니다.
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost';

      // sockjs-client는 상대경로(/api/ws-stomp) 또는 절대경로(https://...) 모두 지원합니다.
      // Nginx Reverse Proxy (HTTPS 443) -> Backend (HTTP 8080) 구조에서는
      // 클라이언트는 Nginx (HTTPS) 로 접근해야 하므로 https 주소를 그대로 써야 합니다.
      // 기존처럼 http로 강제 변환하거나 :8080을 붙이면 'Connection Refused' 또는 'Mixed Content' 에러가 납니다.

      // 단, Nginx 설정 상 /ws-stomp 경로는 /api/ws-stomp 가 아니라 루트 레벨 등 경로 매핑 확인이 필요합니다.
      // 일반적으로 백엔드 API가 /api/로 프록시된다면 소켓도 /api/ws-stomp 일 수 있고, 
      // 별도 설정이면 /ws-stomp 일 수 있습니다. 확인된 context상 /ws-stomp는 루트에 있을 가능성이 높지만
      // Nginx 설정을 보면 /api/ -> backend, 그 외에는 명시적이지 않습니다.
      // 만약 백엔드의 /ws-stomp 엔드포인트가 Nginx의 /api/ws-stomp로 노출된다면 경로 수정이 필요합니다.
      // 현재 일반적인 STOMP 설정은 /ws-stomp 이므로, Nginx가 이를 처리하는지 봐야합니다.
      // Docker-compose에서 Nginx는 /api/ 및 /oauth2/ 만 프록시하고 있습니다.
      // 따라서 /ws-stomp 요청은 Nginx에서 404가 될 수 있습니다.
      
      // -> Nginx 설정을 보면 /ws-stomp에 대한 프록시 설정이 없습니다! 
      // 이 경우 백엔드로 직접 가거나 (8080은 막힘), Nginx 설정을 추가해야 합니다.
      // 또는 /api/ws-stomp로 요청하고 백엔드에서 context-path를 맞추거나 해야 합니다.
      
      // 일단 기존 코드에서는 http://backend:8080 을 직접 찔렀던 것 같은데, 
      // 브라우저에서는 Nginx(443)만 접근 가능하므로 Nginx가 /ws-stomp도 프록시해줘야 합니다.
      // 하지만 당장 Nginx 설정을 못 바꾼다면, /api 경로 하위에 소켓이 존재하는지 확인해야 합니다.
      // 만약 백엔드가 /ws-stomp 로 열려있다면, 프론트에서는 https://localhost/ws-stomp 로 요청하고
      // Nginx conf에 location /ws-stomp { proxy_pass http://backend; ... } 가 있어야 합니다.
      
      // 우선 환경변수 그대로 사용하도록 롤백합니다 (http 강제 변환 제거).
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
