import { Client } from '@stomp/stompjs';
import { useSocketContext } from '@/domains/study/context/SocketContext';

export function useSocket(
  roomId?: string | number | null,
  userId?: number | null, // unused arguments kept for compatibility
): Client | null {
  const { client, connected } = useSocketContext();
  return connected ? client : null;
}

export function quitStudy(client: Client, studyId: number, userId: number) {
  if (!client || !client.connected) return;
  client.publish({
    destination: '/pub/studies/quit',
    body: JSON.stringify({ studyId: studyId, userId: String(userId) }),
  });
}

