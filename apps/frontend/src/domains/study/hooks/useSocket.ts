import { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useRoomStore } from './useRoomStore';

const BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';
const BROKER_URL = `${BASE_URL}/ws-stomp`;

export function useSocket(roomId: number | null, userId: number | null): Client | null {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const setVideoToken = useRoomStore((state) => state.setVideoToken);
  const setWatchers = useRoomStore((state) => state.setWatchers);

  useEffect(() => {
    if (!roomId || !userId) return;

    if (clientRef.current) {
        // Already initialized
        return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(BROKER_URL),
      connectHeaders: {
        userId: String(userId)
      },
      // debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        setConnected(true);
        console.log('STOMP connected');

        // Subscribe to Video Token (Specific to user)
        // Topic: /topic/studies/{id}/video-token/{uid}
        client.subscribe(`/topic/studies/${roomId}/video-token/${userId}`, (message) => {
             try {
                const body = JSON.parse(message.body);
                // Payload: { type: "VIDEO_TOKEN", data: "token_string" }
                if (body.type === 'VIDEO_TOKEN' && body.data) {
                    console.log('[STOMP] Received Video Token');
                    setVideoToken(body.data);
                }
             } catch(e) {
                 console.error('[STOMP] Failed to parse video token message', e);
             }
        });

        // Subscribe to Watchers
        client.subscribe(`/topic/studies/rooms/${roomId}/ide/${userId}/watchers`, (message) => {
             try {
                const body = JSON.parse(message.body);
                if (body && body.data) {
                     // Expecting { count: number, names: string[] }
                     const { count, names } = body.data;
                     setWatchers(count || 0, names || []);
                }
             } catch(e) {
                 console.error('[STOMP] Failed to parse watchers message', e);
             }
        });

        // Subscribe to Error Notifications
        client.subscribe(`/topic/studies/rooms/${roomId}/error/${userId}`, (message) => {
             try {
                const body = JSON.parse(message.body);
                if (body && body.error) {
                    console.error('[STOMP] Received Error Notification:', body.error);
                    // Simple alert for now, can be upgraded to Toaster later
                    // alert(`[Error] ${body.error.message}`); 
                }
             } catch(e) {
                 console.error('[STOMP] Failed to parse error message', e);
             }
        });

        // Auto-join room on connect if protocol requires explicit enter
        client.publish({ 
            destination: '/pub/studies/enter', 
            body: JSON.stringify({ studyId: roomId, userId: String(userId) }) 
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
      onDisconnect: () => {
        setConnected(false);
        console.log('STOMP disconnected');
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      // Cleanup on unmount (leave room + disconnect)
      if (client.connected) {
         client.publish({ 
             destination: '/pub/studies/leave', 
             body: JSON.stringify({ studyId: roomId }) 
         });
         client.deactivate();
      }
      setConnected(false);
      clientRef.current = null;
    };
  }, [roomId, userId]);

  return connected ? clientRef.current : null;
}

// Standalone actions using the client instance
export function quitStudy(client: Client, studyId: number, userId: number) {
    if (!client.connected) return;
    client.publish({
        destination: '/pub/studies/quit',
        body: JSON.stringify({ studyId: studyId, userId: String(userId) })
    });
}
