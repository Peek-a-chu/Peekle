import { useEffect, useCallback, useRef } from 'react';
import { IMessage } from '@stomp/stompjs';
import { toast } from 'sonner';
import { useRoomStore } from './useRoomStore';
import { useSocketContext } from '@/domains/study/context/SocketContext';
import { WhiteboardMessage } from '@/domains/study/types/whiteboard';
import { useAuthStore } from '@/store/auth-store';

export function useWhiteboardSocket(
  roomId: string,
  onMessageReceived?: (msg: WhiteboardMessage) => void,
  options: { enabled?: boolean } = {},
) {
  const { client, connected } = useSocketContext();
  const { setWhiteboardOverlayOpen } = useRoomStore();
  const { user } = useAuthStore();
  const { enabled = true } = options;

  // Ref to hold the subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const hasSyncedRef = useRef(false);

  // Subscribe handling
  useEffect(() => {
    if (!client || !connected || !roomId || !enabled) return;

    // Unsubscribe if exists (though usually roomId doesn't change often)
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Reset sync flag on new subscription
    hasSyncedRef.current = false;

    const topic = `/topic/studies/rooms/${roomId}/whiteboard`;
    const userTopic = user?.id ? `/topic/studies/rooms/${roomId}/whiteboard/${user.id}` : null;

    console.log(`[useWhiteboardSocket] Subscribing to ${topic} (and ${userTopic})`);

    const handleMessage = (message: IMessage) => {
      try {
        const body = JSON.parse(message.body) as WhiteboardMessage;
        console.log(`[useWhiteboardSocket] Received:`, body.action, body.objectId || '');

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
    };

    const sub = client.subscribe(topic, handleMessage);
    let userSub: any = null;

    if (userTopic) {
      userSub = client.subscribe(userTopic, handleMessage);
    }

    subscriptionRef.current = {
      unsubscribe: () => {
        sub.unsubscribe();
        if (userSub) userSub.unsubscribe();
      }
    };

    // Request SYNC after subscription is established
    setTimeout(() => {
      if (client && connected && !hasSyncedRef.current) {
        console.log(`[useWhiteboardSocket] Requesting initial SYNC for room ${roomId}`);
        client.publish({
          destination: '/pub/studies/whiteboard/message',
          body: JSON.stringify({ action: 'SYNC' }),
        });
        hasSyncedRef.current = true;
      }
    }, 200);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [client, connected, roomId, setWhiteboardOverlayOpen, onMessageReceived, enabled, user]);

  const sendMessage = useCallback(
    (payload: WhiteboardMessage) => {
      if (client && connected && roomId) {
        // Headers (studyId) are handled by SocketContext & StompHandler
        // No need to send studyId in body as WhiteboardRequest doesn't have it
        console.log(
          `[useWhiteboardSocket] Sending:`,
          payload.action,
          payload.objectId || '',
          `to room ${roomId}`,
        );
        client.publish({
          destination: '/pub/studies/whiteboard/message',
          body: JSON.stringify(payload),
        });
      }
    },
    [client, connected, roomId],
  );

  // Request sync explicitly (useful after reconnection or manual refresh)
  const requestSync = useCallback(() => {
    if (client && connected) {
      console.log(`[useWhiteboardSocket] Manual SYNC request`);
      client.publish({
        destination: '/pub/studies/whiteboard/message',
        body: JSON.stringify({ action: 'SYNC' }),
      });
    }
  }, [client, connected, roomId]);

  return { isConnected: connected, sendMessage, requestSync };
}
