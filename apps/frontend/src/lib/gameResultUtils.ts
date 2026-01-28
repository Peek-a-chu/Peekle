import type { GameParticipant } from '@/domains/game/types/result';

/**
 * 팀별 총 맞춘 문제 수를 계산합니다.
 */
export const calculateTeamScores = (participants: GameParticipant[]) => {
    const redScore = participants
        .filter(p => p.teamId === 'RED')
        .reduce((acc, p) => acc + (p.solvedCount || 0), 0);
    const blueScore = participants
        .filter(p => p.teamId === 'BLUE')
        .reduce((acc, p) => acc + (p.solvedCount || 0), 0);

    return { redScore, blueScore };
};

/**
 * 승리 팀을 판정합니다.
 */
export const determineWinningTeam = (redScore: number, blueScore: number) => {
    if (redScore > blueScore) return 'RED';
    if (blueScore > redScore) return 'BLUE';
    return 'DRAW';
};

/**
 * 팀 멤버를 분류하고 순위별로 정렬합니다.
 */
export const getTeamMembers = (participants: GameParticipant[]) => {
    const redTeam = participants.filter(p => p.teamId === 'RED').sort((a, b) => a.rank - b.rank);
    const blueTeam = participants.filter(p => p.teamId === 'BLUE').sort((a, b) => a.rank - b.rank);
    return { redTeam, blueTeam };
};
