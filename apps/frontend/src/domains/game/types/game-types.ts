export type GameMode = 'TIME_ATTACK' | 'SPEED_RACE';
export type TeamType = 'INDIVIDUAL' | 'TEAM';
export type GameStatus = 'WAITING' | 'PLAYING' | 'END';
export type ParticipantStatus = 'NOT_READY' | 'READY';
export type Team = 'RED' | 'BLUE';

export interface Participant {
    id: number;
    nickname: string;
    profileImg: string;
    isHost: boolean;
    status: ParticipantStatus;
    team?: Team;
    tier?: string;
}

export interface GameRoom {
    id: number;
    title: string;
    mode: GameMode;
    teamType: TeamType;
    status: GameStatus;
    currentPlayers: number;
    maxPlayers: number;
    timeLimit: number;
    problemCount: number;
    host: {
        id: number;
        nickname: string;
        profileImg: string;
    };
    isPrivate: boolean;
    tags: string[];
    tierMin: string;
    tierMax: string;
}

export interface GameRoomDetail extends GameRoom {
    participants: Participant[];
    problems?: GameProblem[];
}

export interface ChatMessage {
    id: string;
    senderId: number;
    senderNickname: string;
    profileImg: string;
    content: string;
    timestamp: number | string;
    senderTeam?: Team;
}

export interface GameProblem {
    id: number;
    externalId: string;
    title: string;
    tier: string;
    url: string;
    status: 'SOLVED' | 'UNSOLVED';
    solvedBy?: { id: number; nickname: string; team?: Team }[];
}

export interface GamePlayParticipant extends Participant {
    score?: number;
    solvedCount?: number;
}

export interface GamePlayState {
    roomId: number;
    title: string;
    mode: GameMode;
    teamType: TeamType;
    timeLimit: number;
    remainingTime: number;
    problems: GameProblem[];
    participants: GamePlayParticipant[];
    scores?: {
        RED: number;
        BLUE: number;
    };
    status?: GameStatus;
    result?: GameResult;
}

export interface RankingUser {
    userId: number;
    nickname: string;
    score: number;
    solvedCount: number;
    teamColor?: Team;
}

export interface GameResult {
    status: 'END';
    ranking: RankingUser[];
    teamRanking?: Record<string, number>;
    winner?: string; // userId or teamColor
    teamType?: TeamType;
}

// UI용 타입들 (기존 mock-data에서 이동)
export interface GameModeInfo {
    mode: GameMode;
    teamType: TeamType;
    title: string;
    description: string;
}

export interface TierInfo {
    id: string;
    name: string;
    color: string;
}

export interface Workbook {
    id: string;
    title: string;
    description: string;
    problemCount: number;
    creator: string;
    isBookmarked: boolean;
}

export type ProblemSource = 'BOJ_RANDOM' | 'WORKBOOK';

export interface GameCreationFormData {
    title: string;
    isPrivate: boolean;
    password: string;
    mode: GameMode;
    teamType: TeamType;
    maxPlayers: number;
    timeLimit: number;
    problemCount: number;
    problemSource: ProblemSource;
    tierMin: string;
    tierMax: string;
    selectedTags: string[];
    selectedWorkbookId: string | null;
}
