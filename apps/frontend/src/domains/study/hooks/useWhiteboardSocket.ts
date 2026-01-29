import { useEffect, useCallback, useRef } from 'react';
import { IMessage } from '@stomp/stompjs';
import { toast } from 'sonner';
import { useRoomStore } from './useRoomStore';
import { useSocketContext } from '@/domains/study/context/SocketContext';
import { WhiteboardMessage } from '@/domains/study/types/whiteboard';
import { useAuthStore } from '@/store/auth-store';
import { useStudyStore } from '@/domains/study/store/study-store';

export function useWhiteboardSocket(
  roomId: string,
  userIdOrCallback?: string | number | ((msg: WhiteboardMessage) => void),
  callbackOrOptions?: ((msg: WhiteboardMessage) => void) | { enabled?: boolean },
  options?: { enabled?: boolean },
) {
  const { client, connected } = useSocketContext();
  const { setWhiteboardOverlayOpen } = useRoomStore();
  const { user } = useAuthStore();
  const { studyId, setStudyId } = useStudyStore();

  // [Zustand] 방 입장 시 studyId 상태 업데이트
  useEffect(() => {
    if (roomId) {
      setStudyId(roomId);
    }
  }, [roomId, setStudyId]);

  let userId: string | undefined;
  let onMessageReceived: ((msg: WhiteboardMessage) => void) | undefined;
  let enabled = true;

  if (typeof userIdOrCallback === 'function') {
    onMessageReceived = userIdOrCallback;
    const opts = callbackOrOptions as { enabled?: boolean };
    enabled = opts?.enabled ?? true;
    userId = user?.id ? String(user.id) : undefined;
  } else {
    userId = userIdOrCallback ? String(userIdOrCallback) : (user?.id ? String(user.id) : undefined);
    onMessageReceived = callbackOrOptions as (msg: WhiteboardMessage) => void;
    enabled = options?.enabled ?? true;
  }

  // Ref to hold the subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // [New] Flush queue when connected
  useEffect(() => {
    if (client && connected && roomId && messageQueueRef.current.length > 0) {
      console.log(`[useWhiteboardSocket] Flushing ${messageQueueRef.current.length} queued messages`);
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];

      queue.forEach((payload) => {
        try {
          client.publish({
            destination: '/pub/studies/whiteboard/message',
            headers: { studyId: studyId || roomId },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error('[useWhiteboardSocket] Error publishing queued message:', error);
        }
      });
    }
  }, [client, connected, roomId, studyId]);

  // Subscribe handling
  useEffect(() => {
    if (!client || !connected || !roomId || !enabled) {
      // Clear any pending sync timeout when disabled
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      // Unsubscribe when disabled
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      return;
    }

    // Unsubscribe if exists (though usually roomId doesn't change often)
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const topic = `/topic/studies/rooms/${roomId}/whiteboard`;
    const userTopic = userId ? `/topic/studies/rooms/${roomId}/whiteboard/${userId}` : null;
    const chatTopic = `/topic/studies/rooms/${roomId}/chat`;
    const chatUserTopic = userId ? `/topic/studies/rooms/${roomId}/chat/${userId}` : null;

    console.log(`[useWhiteboardSocket] Subscribing to ${topic}, ${chatTopic} (and ${userTopic}, ${chatUserTopic})`);

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
    const subChat = client.subscribe(chatTopic, handleMessage);
    let userChatSub: any = null;

    if (userTopic) {
      userSub = client.subscribe(userTopic, handleMessage);
    }
    if (chatUserTopic) {
      userChatSub = client.subscribe(chatUserTopic, handleMessage);
    }

    subscriptionRef.current = {
      unsubscribe: () => {
        sub.unsubscribe();
        if (userSub) userSub.unsubscribe();
        subChat.unsubscribe();
        if (userChatSub) userChatSub.unsubscribe();
      }
    };

    // Always request SYNC after subscription is established
    // Backend @EventListener may also send SYNC, but we ensure it by requesting explicitly
    // Clear any existing timeout first
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      if (client && connected) {
        console.log(`[useWhiteboardSocket] Requesting SYNC for room ${roomId} after subscription`);
        client.publish({
          destination: '/pub/studies/whiteboard/message',
          headers: { studyId: studyId || roomId },
          body: JSON.stringify({ action: 'SYNC' }),
        });
      }
      syncTimeoutRef.current = null;
    }, 300); // Slightly longer delay to ensure subscription is fully established

    return () => {
      // Clear sync timeout on cleanup
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [client, connected, roomId, setWhiteboardOverlayOpen, onMessageReceived, enabled, userId, studyId]);

  const sendMessage = useCallback(
    (payload: any) => {
      if (client && connected && roomId) {
        // Headers (studyId) are handled by SocketContext & StompHandler
        // No need to send studyId in body as WhiteboardRequest doesn't have it
        try {
          console.log(
            `[useWhiteboardSocket] Sending:`,
            payload.action,
            payload.objectId || '',
            `to room ${roomId}`,
          );
          client.publish({
            destination: '/pub/studies/whiteboard/message',
            headers: { studyId: studyId || roomId },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.error('[useWhiteboardSocket] Error publishing message:', error);
        }
      } else {
        console.log('[useWhiteboardSocket] Connection not ready, queueing message:', {
          isConnected: connected,
          action: payload?.action,
        });
        messageQueueRef.current.push(payload);
      }
    },
    [client, connected, roomId, studyId],
  );

  // Request sync explicitly (useful after reconnection or manual refresh)
  const requestSync = useCallback(() => {
    if (client && connected && roomId) {
      console.log(`[useWhiteboardSocket] Manual SYNC request for room ${roomId}`);
      client.publish({
        destination: '/pub/studies/whiteboard/message',
        headers: { studyId: studyId || roomId },
        body: JSON.stringify({ action: 'SYNC' }),
      });
    } else {
      console.warn('[useWhiteboardSocket] Cannot request SYNC:', {
        hasClient: !!client,
        isConnected: connected,
        hasRoomId: !!roomId,
      });
    }
  }, [client, connected, roomId, studyId]);

  return { isConnected: connected, sendMessage, requestSync };
}
