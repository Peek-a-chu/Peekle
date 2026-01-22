// 게임 모드 타입
export type GameMode = 'TIME_ATTACK' | 'SPEED_RACE'
export type TeamType = 'INDIVIDUAL' | 'TEAM'
export type GameStatus = 'WAITING' | 'PLAYING'

// 게임방 인터페이스
export interface GameRoom {
    id: string
    title: string
    mode: GameMode
    teamType: TeamType
    status: GameStatus
    currentPlayers: number
    maxPlayers: number
    timeLimit: number // 분 단위
    problemCount: number
    host: {
        id: string
        nickname: string
        profileImg: string
    }
    isPrivate: boolean
    tags: string[]
    createdAt: string
}

// 게임 모드 정보
export interface GameModeInfo {
    mode: GameMode
    teamType: TeamType
    title: string
    description: string
}

// 게임 모드 목록 (2x2 그리드용)
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
]

// Mock 게임방 데이터
export const mockGameRooms: GameRoom[] = [
    {
        id: '1',
        title: '골드 타임어택',
        mode: 'TIME_ATTACK',
        teamType: 'INDIVIDUAL',
        status: 'PLAYING',
        currentPlayers: 3,
        maxPlayers: 6,
        timeLimit: 60,
        problemCount: 10,
        host: {
            id: 'user1',
            nickname: 'CodeMaster',
            profileImg: '/avatars/default.png',
        },
        isPrivate: false,
        tags: ['골드', '구현'],
        createdAt: '2026-01-21T14:30:00',
    },
    {
        id: '2',
        title: '실버 스피드 레이스',
        mode: 'SPEED_RACE',
        teamType: 'INDIVIDUAL',
        status: 'WAITING',
        currentPlayers: 2,
        maxPlayers: 4,
        timeLimit: 30,
        problemCount: 5,
        host: {
            id: 'user2',
            nickname: 'AlgoKing',
            profileImg: '/avatars/default.png',
        },
        isPrivate: false,
        tags: ['실버', 'DP'],
        createdAt: '2026-01-21T14:25:00',
    },
    {
        id: '3',
        title: '팀전 대회',
        mode: 'TIME_ATTACK',
        teamType: 'TEAM',
        status: 'WAITING',
        currentPlayers: 3,
        maxPlayers: 6,
        timeLimit: 45,
        problemCount: 8,
        host: {
            id: 'user3',
            nickname: '해론다이',
            profileImg: '/avatars/default.png',
        },
        isPrivate: true,
        tags: ['팀전', '브론즈'],
        createdAt: '2026-01-21T14:20:00',
    },
    {
        id: '4',
        title: '초보자 환영',
        mode: 'TIME_ATTACK',
        teamType: 'INDIVIDUAL',
        status: 'WAITING',
        currentPlayers: 1,
        maxPlayers: 8,
        timeLimit: 90,
        problemCount: 15,
        host: {
            id: 'user4',
            nickname: '엔트립중',
            profileImg: '/avatars/default.png',
        },
        isPrivate: false,
        tags: ['초보', '브론즈'],
        createdAt: '2026-01-21T14:15:00',
    },
    {
        id: '5',
        title: '팀 스피드 배틀',
        mode: 'SPEED_RACE',
        teamType: 'TEAM',
        status: 'PLAYING',
        currentPlayers: 4,
        maxPlayers: 4,
        timeLimit: 20,
        problemCount: 3,
        host: {
            id: 'user5',
            nickname: '스피드러너',
            profileImg: '/avatars/default.png',
        },
        isPrivate: false,
        tags: ['팀전', '스피드'],
        createdAt: '2026-01-21T14:10:00',
    },
    {
        id: '6',
        title: '다이아 도전',
        mode: 'TIME_ATTACK',
        teamType: 'INDIVIDUAL',
        status: 'WAITING',
        currentPlayers: 2,
        maxPlayers: 6,
        timeLimit: 120,
        problemCount: 5,
        host: {
            id: 'user6',
            nickname: 'ProCoder',
            profileImg: '/avatars/default.png',
        },
        isPrivate: true,
        tags: ['다이아', '고수'],
        createdAt: '2026-01-21T14:05:00',
    },
]

// 필터링 함수
export function filterGameRooms(
    rooms: GameRoom[],
    filters: {
        mode?: GameMode
        teamType?: TeamType
        status?: GameStatus | 'ALL'
        search?: string
    }
): GameRoom[] {
    return rooms.filter((room) => {
        // 모드 필터
        if (filters.mode && room.mode !== filters.mode) return false

        // 팀 타입 필터
        if (filters.teamType && room.teamType !== filters.teamType) return false

        // 상태 필터
        if (filters.status && filters.status !== 'ALL' && room.status !== filters.status)
            return false

        // 검색 필터
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            const matchTitle = room.title.toLowerCase().includes(searchLower)
            const matchTags = room.tags.some((tag) => tag.toLowerCase().includes(searchLower))
            const matchHost = room.host.nickname.toLowerCase().includes(searchLower)
            if (!matchTitle && !matchTags && !matchHost) return false
        }

        return true
    })
}
