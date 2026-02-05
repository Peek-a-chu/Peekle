import { useGameSocket } from '@/domains/game/context/GameSocketContext';

export function useGameSocketConnection(roomId: string | number, userId: string | number) {
    const { client, connected } = useGameSocket();

    // Global connection handles everything. This hook now just exposes the context.
    // Ensure that downstream components (waiting room, play room) use this client.

    return { client, connected };
}
