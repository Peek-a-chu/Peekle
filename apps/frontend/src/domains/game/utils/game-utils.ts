import { GameRoom, GameMode, TeamType, GameStatus } from '../types/game-types';

export function filterGameRooms(
    rooms: GameRoom[],
    filters: {
        mode?: GameMode;
        teamType?: TeamType;
        status?: GameStatus | 'ALL';
        search?: string;
    },
): GameRoom[] {
    return rooms.filter((room) => {
        // 모드 필터
        if (filters.mode && room.mode !== filters.mode) return false;

        // 팀 타입 필터
        if (filters.teamType && room.teamType !== filters.teamType) return false;

        // 상태 필터
        if (filters.status && filters.status !== 'ALL' && room.status !== filters.status) return false;

        // 검색 필터
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchTitle = room.title.toLowerCase().includes(searchLower);
            const matchTags = room.tags.some((tag) => tag.toLowerCase().includes(searchLower));
            const matchHost = room.host.nickname.toLowerCase().includes(searchLower);
            if (!matchTitle && !matchTags && !matchHost) return false;
        }

        return true;
    });
}
