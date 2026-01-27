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
    if (!socket || !viewingUser) {
      setCode('');
      setLanguage('python');
      return;
    }

    // [New] Request code when starting to view someone
    socket.emit('request-code', {
      roomId: String(roomId),
      targetUserId: viewingUser.id,
    });

    const handleCodeUpdate = (data: { userId: number; code: string }): void => {
      if (data.userId === viewingUser.id) {
        setCode(data.code);
      }
    };

    const handleLanguageUpdate = (data: { userId: number; language: string }): void => {
      if (data.userId === viewingUser.id) {
        setLanguage(data.language);
      }
    };

    socket.on('code-update', handleCodeUpdate);
    socket.on('language-update', handleLanguageUpdate);

    return () => {
      socket.off('code-update', handleCodeUpdate);
      socket.off('language-update', handleLanguageUpdate);
    };
  }, [socket, viewingUser, roomId]);

  return { code, language };
}
