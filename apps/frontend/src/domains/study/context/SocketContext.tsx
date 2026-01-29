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

  useEffect(() => {
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

    stompClient.activate();
    setClient(stompClient);

    return () => {
      console.log('[STOMP] Disconnecting...');
      stompClient.deactivate();
      setConnected(false);
    };
  }, [roomId, userId]);

  return <SocketContext.Provider value={{ client, connected }}>{children}</SocketContext.Provider>;
}
