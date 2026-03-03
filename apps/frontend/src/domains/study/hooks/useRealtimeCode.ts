import { useState, useEffect } from 'react';
import { Participant, useRoomStore } from './useRoomStore';
import { useSocket } from './useSocket';

export function useRealtimeCode(viewingUser: Participant | null) {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python'); // Default
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);

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
    const ideTopic = `/topic/studies/rooms/${roomId}/ide/${viewingUser.id}`;

    // Subscribe to snapshot response topic
    // Topic: /topic/studies/rooms/{id}/ide/{myUserId}/snapshot
    const snapshotTopic = `/topic/studies/rooms/${roomId}/ide/${currentUserId}/snapshot`;

    const ideSubscription = socket.subscribe(ideTopic, (message) => {
      try {
        const body = JSON.parse(message.body);
        if (body.type === 'IDE' && body.data) {
          setCode(body.data.code);
          if (body.data.lang) {
            setLanguage(body.data.lang);
          }
        }
      } catch (e) {
        console.error('Error parsing IDE message', e);
      }
    });

    const snapshotSubscription = socket.subscribe(snapshotTopic, (message) => {
      try {
        const body = JSON.parse(message.body);
        if (body.type === 'IDE_SNAPSHOT' && body.data) {
          setCode(body.data.code);
          if (body.data.lang) {
            setLanguage(body.data.lang);
          }
        }
      } catch (e) {
        console.error('Error parsing IDE snapshot message', e);
      }
    });

    // Request initial snapshot of the user's code
    socket.publish({
      destination: '/pub/ide/request-snapshot',
      body: JSON.stringify({ targetUserId: viewingUser.id, problemId: selectedStudyProblemId }),
    });

    return () => {
      ideSubscription.unsubscribe();
      snapshotSubscription.unsubscribe();
    };
  }, [socket, viewingUser, roomId, currentUserId, selectedStudyProblemId]);

  return { code, language };
}
