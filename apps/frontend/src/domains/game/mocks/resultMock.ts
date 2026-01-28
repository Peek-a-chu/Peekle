import type { GameResultData } from '../types/result';

export const mockGameResult: GameResultData = {
    participants: [
        {
            userId: 'me',
            nickname: '사용자(나)',
            score: 3000,
            rank: 7,
            isMe: true,
            profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
            clearTime: 500,
            solvedCount: 10,
            teamId: 'RED'
        },
        {
            userId: 'user1',
            nickname: '코드마스터',
            score: 8000,
            rank: 1,
            profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
            clearTime: 650,
            solvedCount: 8,
            teamId: 'BLUE'
        },
        {
            userId: 'user2',
            nickname: '알고리즘천재',
            score: 2000,
            rank: 4,
            profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
            clearTime: 680,
            solvedCount: 9,
            teamId: 'RED'
        },
        {
            userId: 'user4',
            nickname: '낙천적인코더',
            score: 6000,
            rank: 2,
            profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4',
            clearTime: 710,
            solvedCount: 5,
            teamId: 'BLUE'
        },
        {
            userId: 'user5',
            nickname: '디버그장인',
            score: 1000,
            rank: 5,
            profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5',
            clearTime: 720,
            solvedCount: 6,
            teamId: 'RED'
        }
    ],
    personalStats: {
        pointsGained: 550,
        correctAnswers: 10,
        totalQuestions: 10,
        accuracy: 100
    },
    leagueInfo: {
        league: 'gold',
        currentExp: 1400,
        maxExp: 2000,
        gainedExp: 550
    },
    mode: 'TIME_ATTACK',
    teamType: 'TEAM',
    playTime: 500
};
