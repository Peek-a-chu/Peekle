'use client';

import { useEffect, useRef } from 'react';
import { useGameSocket } from '@/domains/game/context/GameSocketContext';

interface LobbyEventHandlers {
    onRoomCreated?: (data: any) => void;
    onRoomUpdated?: (data: any) => void;
    onRoomDeleted?: (data: any) => void;
    onPlayerUpdate?: (data: any) => void;
    onHostUpdated?: (data: any) => void;
}

/**
 * 게임 로비용 WebSocket 훅
 * /topic/games/lobby 토픽을 구독하여 게임방 생성/업데이트/삭제 이벤트를 수신합니다.
 */
export function useGameLobbySocket(handlers: LobbyEventHandlers) {
    const { client, connected } = useGameSocket();
    const subscriptionRef = useRef<any>(null);
    const handlersRef = useRef(handlers);

    // 핸들러가 변경될 때마다 ref 업데이트
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!client || !connected) {
            return;
        }

        const LOBBY_TOPIC = '/topic/games/lobby';

        console.log('[GameLobby] Subscribing to lobby events:', LOBBY_TOPIC);

        // 로비 토픽 구독
        subscriptionRef.current = client.subscribe(LOBBY_TOPIC, (message) => {
            try {
                const response = JSON.parse(message.body);
                const { type, data } = response;

                console.log('[GameLobby] Received event:', type, data);

                // 이벤트 타입별 핸들러 호출
                switch (type) {
                    case 'LOBBY_ROOM_CREATED':
                        handlersRef.current.onRoomCreated?.(data);
                        break;
                    case 'LOBBY_ROOM_UPDATED':
                        handlersRef.current.onRoomUpdated?.(data);
                        break;
                    case 'LOBBY_ROOM_DELETED':
                        handlersRef.current.onRoomDeleted?.(data);
                        break;
                    case 'LOBBY_PLAYER_UPDATE':
                        handlersRef.current.onPlayerUpdate?.(data);
                        break;
                    case 'LOBBY_HOST_UPDATE':
                        handlersRef.current.onHostUpdated?.(data);
                        break;
                    default:
                        console.warn('[GameLobby] Unknown event type:', type);
                }
            } catch (error) {
                console.error('[GameLobby] Failed to parse message:', error);
            }
        });

        return () => {
            if (subscriptionRef.current) {
                console.log('[GameLobby] Unsubscribing from lobby events');
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [client, connected]);

    return { connected };
}
