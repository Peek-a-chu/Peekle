import { useState, useEffect } from 'react';
import { Participant, useRoomStore } from './useRoomStore';
import { useSocket } from './useSocket';

export function useRealtimeCode(viewingUser: Participant | null) {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python'); // Default
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);

  // Ensure we have a socket connection
  const socket = useSocket(roomId, currentUserId);

  useEffect(() => {
    if (!socket || !viewingUser || !roomId) {
      setCode('');
      setLanguage('python');
      return;
    }

    // Subscribe to the target user's IDE topic
    // Topic: /topic/studies/rooms/{id}/ide/{userId}
    const topic = `/topic/studies/rooms/${roomId}/ide/${viewingUser.id}`;

    // Also, we might want to request an initial snapshot?
    // Spec table mentioned: /pub/ide/request-snapshot
    // Verify if we need to request it. The user might not be broadcasting if they haven't typed.
    // Ideally we subscribe first.

    const subscription = socket.subscribe(topic, (message) => {
      try {
        const body = JSON.parse(message.body);
        // Payload: { type: "IDE", data: { problemId, code } } (Broadcasted by SocketService)
        if (body.type === 'IDE' && body.data) {
          setCode(body.data.code);
          // language? The payload in SocketService only had code/problemId.
          // If language is missing in backend broadcast, we can't update it.
          // But let's check input of broadcast: it takes `data.code`.
        }
      } catch (e) {
        console.error('Error parsing IDE message', e);
      }
    });

    // Request snapshot logic (Optional, based on spec availability)
    // socket.publish({ destination: '/pub/ide/request-snapshot', body: JSON.stringify({ ... }) })

    return () => {
      subscription.unsubscribe();
    };
  }, [socket, viewingUser, roomId]);

  return { code, language };
}
