import { useState, useEffect } from 'react';
import { Participant, useRoomStore } from './useRoomStore';
import { useSocket } from './useSocket';

export function useRealtimeCode(viewingUser: Participant | null) {
  const [code, setCode] = useState<string>('');
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);

  // Ensure we have a socket connection
  const socket = useSocket(roomId, currentUserId);

  useEffect(() => {
    if (!socket || !viewingUser) {
      setCode('');
      return;
    }

    // [New] Request code when starting to view someone
    socket.emit('request-code', {
      roomId: String(roomId),
      targetUserId: viewingUser.id,
    });

    const handleCodeUpdate = (data: { userId: number; code: string }) => {
      if (data.userId === viewingUser.id) {
        setCode(data.code);
      }
    };

    socket.on('code-update', handleCodeUpdate);

    return () => {
      socket.off('code-update', handleCodeUpdate);
    };
  }, [socket, viewingUser?.id, roomId]);

  return code;
}
