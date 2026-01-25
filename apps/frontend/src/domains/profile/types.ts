export interface UserProfile {
    id: string;
    nickname: string;
    bojId?: string | null;
    league?: string; // e.g. "Silver", "Gold"
    leaguePoint: number;
    leagueGroupId?: string | null;
    streakCurrent: number;
    streakMax: number;
    avatarUrl?: string;
}

export interface SubmissionHistory {
    id: string;
    problemId: number;
    problemTitle: string;
    tier: string; // "Bronze V" etc.
    language: string;
    memory: string; // "31120KB"
    time: string;   // "40ms"
    isSuccess: boolean;
    timestamp: string; // "2026.01.16 10:30"
    sourceType: 'SOLO' | 'STUDY' | 'GAME';
    sourceDetail?: string; // 스터디명 or 게임유형(팀전/개인전)
    code?: string; // 상세 보기 시 보여줄 코드
}
