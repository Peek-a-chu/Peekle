import { useEffect, useCallback, useRef } from 'react';
import { IMessage } from '@stomp/stompjs';
import { toast } from 'sonner';
import { useRoomStore } from './useRoomStore';
import { useSocketContext } from '@/domains/study/context/SocketContext';

export interface WhiteboardMessage {
  action: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'START' | 'CLOSE' | 'CLEAR' | 'SYNC' | 'CURSOR';
  objectId?: string;
  senderName?: string;
  senderId?: number;
  data?: any;
}

export function useWhiteboardSocket(
  roomId: string,
  onMessageReceived?: (msg: WhiteboardMessage) => void,
  options: { enabled?: boolean } = {},
) {
  const { client, connected } = useSocketContext();
  const { setWhiteboardOverlayOpen } = useRoomStore();
  const { enabled = true } = options;

  // Ref to hold the subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Subscribe handling
  useEffect(() => {
    if (!client || !connected || !roomId || !enabled) return;

    // Unsubscribe if exists (though usually roomId doesn't change often)
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const topic = `/topic/studies/rooms/${roomId}/whiteboard`;
    const sub = client.subscribe(topic, (message: IMessage) => {
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

    subscriptionRef.current = sub;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [client, connected, roomId, setWhiteboardOverlayOpen, onMessageReceived, enabled]); // onMessageReceived should be memoized by caller usually

  const sendMessage = useCallback(
    (payload: WhiteboardMessage) => {
      if (client && connected) {
        client.publish({
          destination: '/pub/studies/whiteboard/message',
          body: JSON.stringify(payload),
        });
      }
    },
    [client, connected],
  );

  return { isConnected: connected, sendMessage };
}
