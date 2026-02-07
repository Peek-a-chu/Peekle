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
    workbookTitle?: string;
    problems?: {
        id: number;
        externalId: string;
        title: string;
        tier: string;
        url: string;
    }[];
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
            tierMin: room.tierMin || '브론즈',
            tierMax: room.tierMax || '다이아',
            workbookTitle: room.workbookTitle,
            problems: (room.problems || []).map(p => ({
                id: p.id,
                externalId: p.externalId,
                title: p.title,
                tier: p.tier,
                url: p.url,
                status: 'UNSOLVED' as const, // Default status
            })),
        }));
    } catch (error) {
        console.error('Error fetching game rooms:', error);
        return [];
    }
}

/**
 * 게임 방 상세 조회 (대기방용)
 */
export async function getGameRoom(roomId: string | number): Promise<GameRoomDetail | null> {
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
            tierMin: data.tierMin || '브론즈',
            tierMax: data.tierMax || '다이아',
            workbookTitle: data.workbookTitle,
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
                status: 'UNSOLVED',
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
export async function createGameRoom(data: GameCreateRequest): Promise<number | null> {
    try {
        const response = await apiFetch<number>('/api/games', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (!response.success || !response.data) {
            console.error('Failed to create game room:', response.error);
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('Error creating game room:', error);
        return null;
    }
}

/**
 * 게임 방 입장
 * @returns 입장한 방의 상세 정보 (GameRoomDetail)
 */
export async function enterGameRoom(roomId: string | number, password?: string): Promise<GameRoomDetail | null> {
    try {
        const response = await apiFetch<GameRoomDetailResponse>(`/api/games/${roomId}/enter`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });

        if (!response.success || !response.data) {
            console.error('Failed to enter game room:', response.error);
            throw new Error(response.error?.message || '방 입장에 실패했습니다.');
        }

        // GameRoomDetailResponse를 GameRoomDetail로 변환
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
            tierMin: data.tierMin || '브론즈',
            tierMax: data.tierMax || '다이아',
            workbookTitle: data.workbookTitle,
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
                status: 'UNSOLVED',
            })),
        };
    } catch (error) {
        console.error('Error entering game room:', error);
        throw error;
    }
}

/**
 * 유저 강퇴 (방장 전용)
 */
export async function kickUser(roomId: string | number, targetUserId: string | number): Promise<boolean> {
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

/**
 * 게임 초대 코드 생성
 */
export async function getGameInviteCode(roomId: string | number): Promise<string | null> {
    try {
        const response = await apiFetch<{ inviteCode: string }>(`/api/games/${roomId}/invite-code`, {
            method: 'POST',
        });

        if (!response.success || !response.data) {
            console.error('Failed to get invite code:', response.error);
            return null;
        }

        return response.data.inviteCode;
    } catch (error) {
        console.error('Error getting invite code:', error);
        return null;
    }
}

/**
 * 초대 코드로 방 정보 조회
 */
export async function getGameRoomByCode(code: string): Promise<GameRoom | null> {
    try {
        const response = await apiFetch<GameRoomResponse>(`/api/games/invite/${code}`);

        if (!response.success || !response.data) {
            return null;
        }

        const room = response.data;
        return {
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
            tierMin: room.tierMin || '브론즈',
            tierMax: room.tierMax || '다이아',
            workbookTitle: room.workbookTitle,
        };
    } catch (error) {
        console.error('Error fetching game room by code:', error);
        return null;
    }
}

// ========== ROOM RESERVATION SYSTEM ==========

export interface ReservationResponse {
    success: boolean;
    status: 'RESERVED' | 'EXTENDED' | 'ALREADY_IN_ROOM';
    ttl: number; // Time to live in seconds
}

/**
 * 방 슬롯 예약 (프리조인 진입 시 호출)
 * 30초 TTL로 소프트 예약 생성
 */
export async function reserveRoomSlot(roomId: string | number): Promise<ReservationResponse | null> {
    try {
        const response = await apiFetch<ReservationResponse>(`/api/games/${roomId}/reserve`, {
            method: 'POST',
        });

        if (!response.success || !response.data) {
            console.error('Failed to reserve room slot:', response.error);
            throw response.error || { code: 'UNKNOWN', message: '예약에 실패했습니다.' };
        }

        return response.data;
    } catch (error) {
        console.error('Error reserving room slot:', error);
        throw error;
    }
}

/**
 * 예약 확정 및 입장 (확인 버튼 클릭 시 호출)
 * @returns 입장한 방의 상세 정보
 */
export async function confirmRoomReservation(roomId: string | number, password?: string): Promise<GameRoomDetail | null> {
    try {
        const response = await apiFetch<GameRoomDetailResponse>(`/api/games/${roomId}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });

        if (!response.success || !response.data) {
            console.error('Failed to confirm reservation:', response.error);
            throw response.error || { code: 'UNKNOWN', message: '입장에 실패했습니다.' };
        }

        // GameRoomDetailResponse를 GameRoomDetail로 변환
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
            tierMin: data.tierMin || '브론즈',
            tierMax: data.tierMax || '다이아',
            workbookTitle: data.workbookTitle,
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
                status: 'UNSOLVED',
            })),
        };
    } catch (error) {
        console.error('Error confirming reservation:', error);
        throw error;
    }
}

/**
 * 예약 취소 (프리조인 모달 닫을 때 호출, 선택적)
 */
export async function cancelRoomReservation(roomId: string | number): Promise<boolean> {
    try {
        const response = await apiFetch<void>(`/api/games/${roomId}/reserve`, {
            method: 'DELETE',
        });

        return response.success;
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        return false;
    }
}
