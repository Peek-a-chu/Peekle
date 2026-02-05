import { apiFetch } from '@/lib/api';
import { GameRoom, GameRoomDetail, GameStatus, GameMode, TeamType, Team } from '@/domains/game/types/game-types';

export interface GameCreateRequest {
    title: string;
    mode: GameMode;
    teamType: TeamType;
    maxPlayers: number;
    timeLimit: number;
    problemCount: number;
    password?: string;
    problemSource: string;
    tierMin?: string;
    tierMax?: string;
    selectedWorkbookId?: string;
    selectedTags?: string[];
}

interface GameRoomResponse {
    roomId: number;
    title: string;
    isSecret: boolean;
    status: string; // 'WAITING', 'PLAYING', 'END'
    currentPlayers: number;
    maxPlayers: number;
    timeLimit: number;
    problemCount: number;
    teamType: string;
    mode: string;
    host: {
        id: number;
        nickname: string;
        profileImg: string;
    };
    tags: string[];
    tierMin?: string;
    tierMax?: string;
}

interface GameRoomDetailResponse extends GameRoomResponse {
    participants?: {
        id: number;
        nickname: string;
        profileImg: string;
        host: boolean;
        ready: boolean;
        team?: string;
    }[];
    problems?: {
        id: number;
        externalId: string;
        title: string;
        tier: string;
        url: string;
    }[];
}

/**
 * 게임 방 목록 조회
 */
export async function getGameRooms(): Promise<GameRoom[]> {
    try {
        const response = await apiFetch<GameRoomResponse[]>('/api/games');

        if (!response.success || !response.data) {
            console.error('Failed to fetch game rooms:', response.error);
            return [];
        }

        // 백엔드 응답(GameRoomResponse)을 프론트엔드 타입(GameRoom)으로 변환
        return response.data.map((room) => ({
            id: room.roomId,
            title: room.title,
            mode: room.mode as GameMode,
            teamType: room.teamType as TeamType,
            status: room.status as GameStatus,
            currentPlayers: room.currentPlayers || 0,
            maxPlayers: room.maxPlayers,
            timeLimit: room.timeLimit,
            problemCount: room.problemCount,
            isPrivate: room.isSecret,
            host: {
                id: room.host.id,
                nickname: room.host.nickname,
                profileImg: room.host.profileImg
            },
            tags: room.tags || [],
            tierMin: room.tierMin || '브론즈', // [New]
            tierMax: room.tierMax || '다이아', // [New]
        }));
    } catch (error) {
        console.error('Error fetching game rooms:', error);
        return [];
    }
}

/**
 * 게임 방 상세 조회 (대기방용)
 */
export async function getGameRoom(roomId: string): Promise<GameRoomDetail | null> {
    try {
        const response = await apiFetch<GameRoomDetailResponse>(`/api/games/${roomId}`);
        if (!response.success || !response.data) {
            return null;
        }
        const data = response.data;

        return {
            id: data.roomId,
            title: data.title,
            mode: data.mode as GameMode,
            teamType: data.teamType as TeamType,
            status: data.status as GameStatus,
            currentPlayers: data.currentPlayers,
            maxPlayers: data.maxPlayers,
            timeLimit: data.timeLimit,
            problemCount: data.problemCount,
            host: data.host,
            isPrivate: data.isSecret,
            tags: data.tags,
            tierMin: data.tierMin || '브론즈', // [New]
            tierMax: data.tierMax || '다이아', // [New]
            participants: (data.participants || []).map(p => ({
                id: p.id,
                nickname: p.nickname,
                profileImg: p.profileImg,
                isHost: p.host,
                status: p.ready ? 'READY' : 'NOT_READY',
                team: p.team as Team,
            })),
            problems: (data.problems || []).map(p => ({
                id: p.id,
                externalId: p.externalId,
                title: p.title,
                tier: p.tier,
                url: p.url,
                status: 'UNSOLVED', // 초기값
            })),
        };
    } catch (error) {
        console.error('Error fetching game room:', error);
        return null;
    }
}

/**
 * 게임 방 생성
 */
export async function createGameRoom(data: GameCreateRequest): Promise<string | null> {
    try {
        const response = await apiFetch<number>('/api/games', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (!response.success || !response.data) {
            console.error('Failed to create game room:', response.error);
            return null;
        }

        return String(response.data);
    } catch (error) {
        console.error('Error creating game room:', error);
        return null;
    }
}

/**
 * 게임 방 입장
 */
export async function enterGameRoom(roomId: string, password?: string): Promise<boolean> {
    try {
        const response = await apiFetch<void>(`/api/games/${roomId}/enter`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });

        if (!response.success) {
            console.error('Failed to enter game room:', response.error);
            throw new Error(response.error);
        }

        return true;
    } catch (error) {
        console.error('Error entering game room:', error);
        throw error;
    }
}

/**
 * 유저 강퇴 (방장 전용)
 */
export async function kickUser(roomId: string, targetUserId: string): Promise<boolean> {
    try {
        const response = await apiFetch<void>(`/api/games/${roomId}/kick`, {
            method: 'POST',
            body: JSON.stringify({ targetUserId: Number(targetUserId) }),
        });

        return response.success;
    } catch (error) {
        console.error('Error kicking user:', error);
        return false;
    }
}
