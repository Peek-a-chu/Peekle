import { GameModeInfo, TierInfo, GameCreationFormData } from '../types/game-types';

export const BOJ_TIERS: TierInfo[] = [
    { id: 'bronze', name: '브론즈', color: '#ad5600' },
    { id: 'silver', name: '실버', color: '#435f7a' },
    { id: 'gold', name: '골드', color: '#ec9a00' },
    { id: 'platinum', name: '플래티넘', color: '#27e2a4' },
    { id: 'diamond', name: '다이아몬드', color: '#00b4fc' },
    { id: 'ruby', name: '루비', color: '#ff0062' },
];

export const BOJ_TAGS: string[] = [
    '구현',
    '그래프',
    'DP',
    '그리디',
    '문자열',
    '수학',
    '정렬',
    '브루트포스',
    'BFS',
    'DFS',
    '이분탐색',
    '시뮬레이션',
    '백트래킹',
    '트리',
    '최단경로',
];

export const gameModes: GameModeInfo[] = [
    {
        mode: 'TIME_ATTACK',
        teamType: 'INDIVIDUAL',
        title: '개인전 타임어택',
        description: '제한 시간 내에 최대한 많은 문제를 푸세요!',
    },
    {
        mode: 'SPEED_RACE',
        teamType: 'INDIVIDUAL',
        title: '개인전 스피드',
        description: '누가 먼저 문제를 풀 수 있을까요? 빠른 손이 승리!',
    },
    {
        mode: 'TIME_ATTACK',
        teamType: 'TEAM',
        title: '팀전 타임어택',
        description: '팀원들과 함께 제한 시간 내에 많은 문제를 풀어보세요!',
    },
    {
        mode: 'SPEED_RACE',
        teamType: 'TEAM',
        title: '팀전 스피드',
        description: '팀원들과 협력하여 가장 먼저 문제를 해결하세요!',
    },
];

export const defaultGameCreationForm: GameCreationFormData = {
    title: '',
    isPrivate: false,
    password: '',
    mode: 'TIME_ATTACK',
    teamType: 'INDIVIDUAL',
    maxPlayers: 4,
    timeLimit: 30,
    problemCount: 5,
    problemSource: 'BOJ_RANDOM',
    tierMin: 'bronze',
    tierMax: 'gold',
    selectedTags: [],
    selectedWorkbookId: null,
};
