import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'sonner';
import { useRoomStore } from './useRoomStore';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/ws-stomp';

export interface WhiteboardMessage {
  action: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'START' | 'CLOSE' | 'CLEAR' | 'SYNC' | 'CURSOR';
  objectId?: string;
  senderName?: string;
  senderId?: number;
  data?: any;
}

export function useWhiteboardSocket(roomId: string, onMessageReceived?: (msg: WhiteboardMessage) => void) {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { setWhiteboardOverlayOpen } = useRoomStore();
  
  // Connect function
  useEffect(() => {
    if (!roomId) return;

    const client = new Client({
      // We use SockJS, so we don't set brokerURL directly usually, or we use webSocketFactory
      webSocketFactory: () => new SockJS(SOCKET_URL),
      debug: (str) => {
        // console.log('STOMP: ' + str);
      },
      onConnect: () => {
        setIsConnected(true);
        
        // Subscribe to whiteboard topic
        client.subscribe(`/topic/studies/rooms/${roomId}/whiteboard`, (message: IMessage) => {
          try {
            const body = JSON.parse(message.body) as WhiteboardMessage;
            
            // Global Toast Logic
            if (body.action === 'START') {
              toast.info(`${body.senderName || '참여자'}님이 화이트보드를 활성화했습니다!`, {
                action: {
                  label: '참여하기',
                  onClick: () => setWhiteboardOverlayOpen(true),
                },
                duration: 5000,
              });
            }

            if (onMessageReceived) {
              onMessageReceived(body);
            }
          } catch (err) {
            console.error('Failed to parse whiteboard message', err);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
      onDisconnect: () => {
        setIsConnected(false);
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [roomId, setWhiteboardOverlayOpen, onMessageReceived]);

  const sendMessage = useCallback((payload: WhiteboardMessage) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: '/pub/studies/whiteboard/message',
        body: JSON.stringify(payload),
      });
    }
  }, []);

  return { isConnected, sendMessage };
}
