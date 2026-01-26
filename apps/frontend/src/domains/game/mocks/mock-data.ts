// 게임 모드 타입
export type GameMode = 'TIME_ATTACK' | 'SPEED_RACE';
export type TeamType = 'INDIVIDUAL' | 'TEAM';
export type GameStatus = 'WAITING' | 'PLAYING';
export type ParticipantStatus = 'NOT_READY' | 'READY';
export type Team = 'RED' | 'BLUE';

// 참여자 인터페이스
export interface Participant {
  id: string;
  nickname: string;
  profileImg: string;
  isHost: boolean;
  status: ParticipantStatus;
  tier?: string; // 예: 'gold5'
  team?: Team; // 팀전일 경우에만 사용
}

// 채팅 메시지 인터페이스
export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname: string;
  senderProfileImg: string;
  content: string;
  timestamp: string;
  senderTeam?: Team; // 팀전일 경우에만 사용
}

// 게임방 인터페이스
export interface GameRoom {
  id: string;
  title: string;
  mode: GameMode;
  teamType: TeamType;
  status: GameStatus;
  currentPlayers: number;
  maxPlayers: number;
  timeLimit: number; // 분 단위
  problemCount: number;
  host: {
    id: string;
    nickname: string;
    profileImg: string;
  };
  isPrivate: boolean;
  tags: string[];
  createdAt: string;
}

// 게임방 상세 정보 (대기방용)
export interface GameRoomDetail extends Omit<GameRoom, 'host'> {
  participants: Participant[];
  tierMin: string;
  tierMax: string;
}

// 게임 모드 정보
export interface GameModeInfo {
  mode: GameMode;
  teamType: TeamType;
  title: string;
  description: string;
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
];

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
];

// 필터링 함수
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

// ==========================================
// 게임방 생성 모달용 Mock 데이터
// ==========================================

// BOJ 티어 정보
export interface TierInfo {
  id: string;
  name: string;
  color: string;
}

export const BOJ_TIERS: TierInfo[] = [
  { id: 'bronze', name: '브론즈', color: '#ad5600' },
  { id: 'silver', name: '실버', color: '#435f7a' },
  { id: 'gold', name: '골드', color: '#ec9a00' },
  { id: 'platinum', name: '플래티넘', color: '#27e2a4' },
  { id: 'diamond', name: '다이아몬드', color: '#00b4fc' },
  { id: 'ruby', name: '루비', color: '#ff0062' },
];

// 알고리즘 태그 목록
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

// 문제집 인터페이스
export interface Workbook {
  id: string;
  title: string;
  description: string;
  problemCount: number;
  creator: string;
  isBookmarked: boolean;
}

// Mock 문제집 데이터
export const mockWorkbooks: Workbook[] = [
  {
    id: 'wb1',
    title: '백준 실버 핵심 문제',
    description: '실버 티어 필수 문제 모음',
    problemCount: 20,
    creator: 'CodeMaster',
    isBookmarked: true,
  },
  {
    id: 'wb2',
    title: 'DP 입문',
    description: '다이나믹 프로그래밍 기초 문제',
    problemCount: 15,
    creator: 'AlgoKing',
    isBookmarked: true,
  },
  {
    id: 'wb3',
    title: '그래프 탐색 마스터',
    description: 'BFS, DFS 완벽 정복',
    problemCount: 12,
    creator: '해론다이',
    isBookmarked: false,
  },
  {
    id: 'wb4',
    title: '코딩테스트 빈출 문제',
    description: '취업 준비 필수 문제집',
    problemCount: 30,
    creator: 'ProCoder',
    isBookmarked: true,
  },
  {
    id: 'wb5',
    title: '문자열 알고리즘',
    description: '문자열 처리의 모든 것',
    problemCount: 10,
    creator: '엔트립중',
    isBookmarked: false,
  },
];

// 게임 생성 폼 데이터 타입
export type ProblemSource = 'BOJ_RANDOM' | 'WORKBOOK';

export interface GameCreationFormData {
  // Step 1: 기본 설정
  title: string;
  isPrivate: boolean;
  password: string;
  mode: GameMode;
  teamType: TeamType;
  maxPlayers: number;
  timeLimit: number; // 분 단위 (타임어택 전용)
  problemCount: number;

  // Step 2: 문제 출제
  problemSource: ProblemSource;
  // BOJ 랜덤 설정
  tierMin: string;
  tierMax: string;
  selectedTags: string[];
  // 문제집 설정
  selectedWorkbookId: string | null;
}

// 기본 폼 데이터
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

// ==========================================
// 게임 대기방용 Mock 데이터
// ==========================================

// Mock 채팅 메시지 데이터 (개인전용)
export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg1',
    senderId: 'user1',
    senderNickname: 'CodeNinja',
    senderProfileImg: '/avatars/default.png',
    content: '오늘 문제 어떤거요? 👀',
    timestamp: '2026-01-24T20:00:00',
  },
  {
    id: 'msg2',
    senderId: 'user3',
    senderNickname: '백준킹',
    senderProfileImg: '/avatars/default.png',
    content: '그래프랑 DP 하면 좋겠습니다!',
    timestamp: '2026-01-24T20:01:00',
  },
  {
    id: 'msg3',
    senderId: 'user2',
    senderNickname: 'PS마스터',
    senderProfileImg: '/avatars/default.png',
    content: 'import heapq',
    timestamp: '2026-01-24T20:02:00',
  },
  {
    id: 'msg4',
    senderId: 'user2',
    senderNickname: 'PS마스터',
    senderProfileImg: '/avatars/default.png',
    content: '이렇게 시작하면 돼요',
    timestamp: '2026-01-24T20:02:30',
  },
];

// Mock 팀전 채팅 메시지 데이터
export const mockTeamChatMessages: ChatMessage[] = [
  {
    id: 'team-msg1',
    senderId: 'user3',
    senderNickname: '해론다이',
    senderProfileImg: '/avatars/default.png',
    content: '레드팀 화이팅! 🔥',
    timestamp: '2026-01-24T20:00:00',
    senderTeam: 'RED',
  },
  {
    id: 'team-msg2',
    senderId: 'user6',
    senderNickname: 'BlueLeader',
    senderProfileImg: '/avatars/default.png',
    content: '블루팀도 질 수 없죠 💙',
    timestamp: '2026-01-24T20:01:00',
    senderTeam: 'BLUE',
  },
  {
    id: 'team-msg3',
    senderId: 'user4',
    senderNickname: 'RedPlayer1',
    senderProfileImg: '/avatars/default.png',
    content: 'DP 문제 나오면 좋겠다',
    timestamp: '2026-01-24T20:02:00',
    senderTeam: 'RED',
  },
  {
    id: 'team-msg4',
    senderId: 'user7',
    senderNickname: 'BluePlayer1',
    senderProfileImg: '/avatars/default.png',
    content: '그래프가 더 재밌지 않나요?',
    timestamp: '2026-01-24T20:02:30',
    senderTeam: 'BLUE',
  },
];

// 방 ID별 채팅 메시지 조회
export function getMockChatMessages(roomId: string): ChatMessage[] {
  // 팀전 방 (room 3)인 경우 팀 채팅 반환
  if (roomId === '3') {
    return mockTeamChatMessages;
  }
  return mockChatMessages;
}

// Mock 대기방 상세 정보 (각 방 ID별)
const mockGameRoomDetails: Record<string, GameRoomDetail> = {
  // 방 2: 실버 스피드 레이스 - 모두 준비 완료 (시작 버튼 활성화)
  '2': {
    id: '2',
    title: '실버 스피드 레이스',
    mode: 'SPEED_RACE',
    teamType: 'INDIVIDUAL',
    status: 'WAITING',
    currentPlayers: 2,
    maxPlayers: 4,
    timeLimit: 30,
    problemCount: 5,
    isPrivate: false,
    tags: ['실버', 'DP'],
    createdAt: '2026-01-21T14:25:00',
    tierMin: 'silver5',
    tierMax: 'silver1',
    participants: [
      {
        id: 'user1',
        nickname: 'AlgoKing',
        profileImg: '/avatars/default.png',
        isHost: true,
        status: 'READY',
        tier: 'silver2',
      },
      {
        id: 'user2',
        nickname: 'SpeedCoder',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'NOT_READY', // 준비 버튼 테스트를 위해 대기 상태로 변경
        tier: 'silver3',
      },
    ],
  },
  // 방 3: 팀전 대회 - 일부만 준비
  '3': {
    id: '3',
    title: '팀전 대회',
    mode: 'TIME_ATTACK',
    teamType: 'TEAM',
    status: 'WAITING',
    currentPlayers: 7,
    maxPlayers: 8,
    timeLimit: 45,
    problemCount: 8,
    isPrivate: true,
    tags: ['팀전', '브론즈'],
    createdAt: '2026-01-21T14:20:00',
    tierMin: 'bronze5',
    tierMax: 'bronze1',
    participants: [
      {
        id: 'user2',
        nickname: 'PS마스터',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'NOT_READY',
        tier: 'gold5',
        team: 'RED',
      },
      // 레드팀 (상단 4명)
      {
        id: 'user3',
        nickname: '해론다이',
        profileImg: '/avatars/default.png',
        isHost: true,
        status: 'NOT_READY',
        tier: 'bronze1',
        team: 'RED',
      },
      {
        id: 'user4',
        nickname: 'RedPlayer1',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'READY',
        tier: 'bronze2',
        team: 'RED',
      },
      {
        id: 'user5',
        nickname: 'RedPlayer2',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'NOT_READY',
        tier: 'bronze3',
        team: 'RED',
      },
      // 블루팀 (하단 4명)
      {
        id: 'user6',
        nickname: 'BlueLeader',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'READY',
        tier: 'bronze1',
        team: 'BLUE',
      },
      {
        id: 'user7',
        nickname: 'BluePlayer1',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'READY',
        tier: 'bronze2',
        team: 'BLUE',
      },
      {
        id: 'user8',
        nickname: 'BluePlayer2',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'NOT_READY',
        tier: 'bronze3',
        team: 'BLUE',
      },
    ],
  },
  // 방 4: 초보자 환영 - 방장만 있음
  '4': {
    id: '4',
    title: '초보자 환영',
    mode: 'TIME_ATTACK',
    teamType: 'INDIVIDUAL',
    status: 'WAITING',
    currentPlayers: 1,
    maxPlayers: 8,
    timeLimit: 90,
    problemCount: 15,
    isPrivate: false,
    tags: ['초보', '브론즈'],
    createdAt: '2026-01-21T14:15:00',
    tierMin: 'bronze5',
    tierMax: 'silver5',
    participants: [
      {
        id: 'user1',
        nickname: '엔트립중',
        profileImg: '/avatars/default.png',
        isHost: true,
        status: 'READY',
        tier: 'bronze1',
      },
    ],
  },
  // 방 6: 다이아 도전
  '6': {
    id: '6',
    title: '다이아 도전',
    mode: 'TIME_ATTACK',
    teamType: 'INDIVIDUAL',
    status: 'WAITING',
    currentPlayers: 2,
    maxPlayers: 6,
    timeLimit: 120,
    problemCount: 5,
    isPrivate: false,
    tags: ['다이아', '그래프'],
    createdAt: '2026-01-21T14:05:00',
    tierMin: 'platinum1',
    tierMax: 'diamond5',
    participants: [
      {
        id: 'user6',
        nickname: 'ProCoder',
        profileImg: '/avatars/default.png',
        isHost: true,
        status: 'READY',
        tier: 'diamond5',
      },
      {
        id: 'user7',
        nickname: 'DiamondHunter',
        profileImg: '/avatars/default.png',
        isHost: false,
        status: 'NOT_READY',
        tier: 'platinum2',
      },
    ],
  },
};

// 기본 방 데이터 (없는 방 ID용)
const defaultRoomDetail: GameRoomDetail = {
  id: '1',
  title: '기본 대기방',
  mode: 'SPEED_RACE',
  teamType: 'INDIVIDUAL',
  status: 'WAITING',
  currentPlayers: 3,
  maxPlayers: 8,
  timeLimit: 30,
  problemCount: 1,
  isPrivate: false,
  tags: ['구현', '백트래킹'],
  createdAt: '2026-01-24T19:30:00',
  tierMin: 'gold5',
  tierMax: 'gold1',
  participants: [
    {
      id: 'user1',
      nickname: 'CodeNinja',
      profileImg: '/avatars/default.png',
      isHost: true,
      status: 'READY',
      tier: 'gold3',
    },
    {
      id: 'user2',
      nickname: 'PS마스터',
      profileImg: '/avatars/default.png',
      isHost: false,
      status: 'READY',
      tier: 'gold5',
    },
    {
      id: 'user3',
      nickname: '백준킹',
      profileImg: '/avatars/default.png',
      isHost: false,
      status: 'NOT_READY',
      tier: 'silver1',
    },
  ],
};

// 방 ID로 Mock 상세 정보 조회
export function getMockGameRoomDetail(roomId: string): GameRoomDetail | null {
  if (!roomId) return null;

  // 정의된 방이 있으면 반환, 없으면 기본 데이터 반환
  if (mockGameRoomDetails[roomId]) {
    return mockGameRoomDetails[roomId];
  }

  return {
    ...defaultRoomDetail,
    id: roomId,
  };
}
