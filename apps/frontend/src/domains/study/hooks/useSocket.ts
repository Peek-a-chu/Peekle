import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001/study';

let socketInstance: Socket | null = null;

export function getSocket(userId: string | number) {
  if (socketInstance) {
    // Check if connecting with different user
    const currentQueryUserId = (socketInstance.io.opts.query as Record<string, string>)?.userId;
    if (String(currentQueryUserId) !== String(userId)) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      query: { userId: String(userId) },
      transports: ['websocket'], // force websocket
    });
  }
  return socketInstance;
}

export function useSocket(roomId: number | null, userId: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const s = getSocket(userId);
    setSocket(s);

    function onConnect() {
      console.log('Socket connected');
      s.emit('join-room', { roomId: String(roomId), userId: String(userId) });
    }

    if (s.connected) {
      onConnect();
    } else {
      s.on('connect', onConnect);
    }

    return () => {
      s.off('connect', onConnect);
    };
  }, [roomId, userId]);

  return socket;
}
