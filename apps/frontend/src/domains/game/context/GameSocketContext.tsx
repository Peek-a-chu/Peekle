"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as StompJs from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/auth-store';

interface GameSocketContextType {
    client: StompJs.Client | null;
    connected: boolean;
    connect: () => void;
    disconnect: () => void;
}

export const GameSocketContext = createContext<GameSocketContextType | null>(null);

export function GameSocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const userId = user?.id; // user 객체 안에 id가 있다고 가정 (auth-store 확인 필요)

    const [client, setClient] = useState<StompJs.Client | null>(null);
    const [connected, setConnected] = useState(false);
    const clientRef = useRef<StompJs.Client | null>(null);

    // 연결 함수
    const connect = () => {
        if (clientRef.current && clientRef.current.active) {
            console.log("Already connected");
            return;
        }

        if (!userId) {
            console.log("No User ID, skipping connection");
            return;
        }

        let baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';
        if (baseUrl.startsWith('https://') && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
            baseUrl = baseUrl.replace('https://', 'http://');
        }

        const socketUrl = `${baseUrl}/ws-stomp`;
        console.log(`[GlobalSocket] Connecting to ${socketUrl} for User ${userId}`);

        const newClient = new StompJs.Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: {
                userId: String(userId),
                // gameId Header is optional global connection
            },
            debug: (str) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log('[GlobalSocket_Debug]', str);
                }
            },
            reconnectDelay: 5000, // 자동 재연결
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        newClient.onConnect = (frame) => {
            console.log('[GlobalSocket] Connected');
            setConnected(true);
        };

        newClient.onStompError = (frame) => {
            console.error('[GlobalSocket] Broker error:', frame.headers['message']);
            console.error('[GlobalSocket] Details:', frame.body);
        };

        newClient.onWebSocketClose = () => {
            console.log('[GlobalSocket] Closed');
            setConnected(false);
        };

        newClient.activate();
        clientRef.current = newClient;
        setClient(newClient);
    };

    // 연결 해제 함수
    const disconnect = () => {
        if (clientRef.current) {
            console.log('[GlobalSocket] Disconnecting...');
            clientRef.current.deactivate();
            clientRef.current = null;
            setClient(null);
            setConnected(false);
        }
    };

    // URL 변경 감지 및 방 퇴장 처리
    const pathname = usePathname();
    const prevPathRef = useRef<string | null>(null);

    useEffect(() => {
        if (prevPathRef.current && prevPathRef.current.startsWith('/game/')) {
            const prevGameIdMatch = prevPathRef.current.match(/\/game\/(\d+)/);
            const prevGameId = prevGameIdMatch ? prevGameIdMatch[1] : null;

            // 현재 경로가 같은 방이 아닐 때만 퇴장 처리
            // 예: /game/123 -> /game/123/play (유지)
            // 예: /game/123 -> /games (퇴장)
            const isStayingInSameRoom = pathname?.startsWith(`/game/${prevGameId}`);

            if (prevGameId && !isStayingInSameRoom) {
                console.log(`[GlobalSocket] Detected leaving room ${prevGameId}`);
                if (client && client.connected) {
                    client.publish({
                        destination: '/pub/games/leave',
                        body: JSON.stringify({ gameId: Number(prevGameId) })
                    });
                }
            }
        }
        prevPathRef.current = pathname;
    }, [pathname, client, connected]);

    // [Anti-Cheat] 유저별 경고 알림 구독 (Path 변경 감지)
    const alertSubscriptionRef = useRef<StompJs.StompSubscription | null>(null);

    useEffect(() => {
        if (!client || !connected || !userId) return;

        const gameIdMatch = pathname?.match(/\/game\/(\d+)/);
        const gameId = gameIdMatch ? gameIdMatch[1] : null;

        // 이미 구독 중인 게임 ID와 다르면 구독 해제
        if (alertSubscriptionRef.current) {
            // 새 게임 ID가 없거나(퇴장), 다른 게임 ID면 해제
            // 여기서는 간단히 항상 해제하고 다시 구독 (pathname이 game이 아니면 그냥 해제)

            // 최적화: gameId가 같으면 유지하고 싶지만, pathname 변경 시마다 실행되므로
            // gameId가 변했을 때만 로직 수행하는 것이 좋음.
            // 하지만 useEffect 의존성에 pathname이 있으므로 매번 실행됨.
        }

        if (gameId) {
            const topic = `/topic/games/${gameId}/alert/${userId}`;

            // 중복 구독 방지 (이미 구독 중인 ID와 같다면 스킵 로직 필요하지만, 단순화를 위해 매번 갱신)
            if (alertSubscriptionRef.current) {
                alertSubscriptionRef.current.unsubscribe();
                alertSubscriptionRef.current = null;
            }

            console.log(`[GlobalSocket] Subscribing to alerts: ${topic}`);
            const sub = client.subscribe(topic, (message) => {
                try {
                    const payload = JSON.parse(message.body);
                    if (payload.type === 'CHEATING_DETECTED') {
                        import('sonner').then(({ toast }) => {
                            toast.error(payload.data || "부정행위가 감지되었습니다!", {
                                duration: 5000,
                                position: 'top-center',
                            });
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse alert message", e);
                }
            });
            alertSubscriptionRef.current = sub;
        } else {
            // 게임 페이지가 아니면 구독 해제
            if (alertSubscriptionRef.current) {
                alertSubscriptionRef.current.unsubscribe();
                alertSubscriptionRef.current = null;
            }
        }

        return () => {
            if (alertSubscriptionRef.current) {
                alertSubscriptionRef.current.unsubscribe();
                alertSubscriptionRef.current = null;
            }
        };
    }, [pathname, client, connected, userId]);

    // 마운트 시 자동 연결 (로그인 상태라면)
    useEffect(() => {
        if (userId) {
            connect();
        } else {
            // 로그아웃 상태면 연결 끊기
            disconnect();
        }

        // 컴포넌트 언마운트 시엔 연결 끊지 않음 (SPA 네비게이션 유지)
        // 단, 로그아웃 등의 명시적 상황이나 앱 종료시는 끊겨야 함. 
        // useEffect cleanup에서 disconnect를 부르면 페이지 이동마다 끊길 수 있으므로 주의.
        // Provider는 layout에 있으므로 앱 전체 새로고침/종료 시에만 cleanup됨.
        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return (
        <GameSocketContext.Provider value={{ client, connected, connect, disconnect }}>
            {children}
        </GameSocketContext.Provider>
    );
}

export const useGameSocket = () => {
    const context = useContext(GameSocketContext);
    if (!context) {
        throw new Error('useGameSocket must be used within a GameSocketProvider');
    }
    return context;
};
