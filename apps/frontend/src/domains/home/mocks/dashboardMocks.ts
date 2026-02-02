import { LeagueType } from '@/components/LeagueIcon';

// 리그 변화 추이 데이터 (30주간 - 다양한 리그 변동)
export interface LeagueProgressData {
  date: string;
  periodEnd: string; // 기간 종료일
  league: LeagueType;
  leagueIndex: number; // 차트용 숫자 인덱스
  score: number; // 해당 주간 점수
}

export const MOCK_LEAGUE_PROGRESS: LeagueProgressData[] = [
  // 초기 (스톤~브론즈)
  { date: '2025-06-04', periodEnd: '2025-06-10', league: 'stone', leagueIndex: 0, score: 120 },
  { date: '2025-06-11', periodEnd: '2025-06-17', league: 'stone', leagueIndex: 0, score: 180 },
  { date: '2025-06-18', periodEnd: '2025-06-24', league: 'bronze', leagueIndex: 1, score: 320 },
  { date: '2025-06-25', periodEnd: '2025-07-01', league: 'bronze', leagueIndex: 1, score: 450 },
  { date: '2025-07-02', periodEnd: '2025-07-08', league: 'bronze', leagueIndex: 1, score: 520 },
  // 브론즈~실버
  { date: '2025-07-09', periodEnd: '2025-07-15', league: 'silver', leagueIndex: 2, score: 680 },
  { date: '2025-07-16', periodEnd: '2025-07-22', league: 'silver', leagueIndex: 2, score: 720 },
  { date: '2025-07-23', periodEnd: '2025-07-29', league: 'bronze', leagueIndex: 1, score: 580 },
  { date: '2025-07-30', periodEnd: '2025-08-05', league: 'silver', leagueIndex: 2, score: 750 },
  { date: '2025-08-06', periodEnd: '2025-08-12', league: 'silver', leagueIndex: 2, score: 820 },
  // 실버~골드
  { date: '2025-08-13', periodEnd: '2025-08-19', league: 'gold', leagueIndex: 3, score: 980 },
  { date: '2025-08-20', periodEnd: '2025-08-26', league: 'gold', leagueIndex: 3, score: 1050 },
  { date: '2025-08-27', periodEnd: '2025-09-02', league: 'gold', leagueIndex: 3, score: 1120 },
  { date: '2025-09-03', periodEnd: '2025-09-09', league: 'silver', leagueIndex: 2, score: 880 },
  { date: '2025-09-10', periodEnd: '2025-09-16', league: 'gold', leagueIndex: 3, score: 1080 },
  // 골드~플레티넘
  // 골드~플레티넘
  { date: '2025-09-17', periodEnd: '2025-09-23', league: 'gold', leagueIndex: 3, score: 1150 },
  { date: '2025-09-24', periodEnd: '2025-09-30', league: 'gold', leagueIndex: 3, score: 1280 }, // 승급 심사 중
  { date: '2025-10-01', periodEnd: '2025-10-07', league: 'gold', leagueIndex: 3, score: 1350 },
  { date: '2025-10-08', periodEnd: '2025-10-14', league: 'gold', leagueIndex: 3, score: 1420 }, // 현재
];

// 활동 스트릭 데이터 (최근 1년)
export interface ActivityStreakData {
  date: string;
  count: number;
}

// 시드 기반 랜덤 생성기 (Hydration Mismatch 방지용)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// 3년간 데이터 생성 (2024-01-01 ~ 2026-12-31)
const generateStreakData = (): ActivityStreakData[] => {
  const data: ActivityStreakData[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2026-12-31');

  let seed = 123456789; // 고정 시드

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // 시드 기반 랜덤값 사용
    seed++;
    const randomVal = seededRandom(seed);
    const randomCountVal = seededRandom(seed + 9999);

    // 랜덤 문제 풀이 수 (0~8)
    const count = randomVal > 0.3 ? Math.floor(randomCountVal * 8) : 0;

    // 희소 데이터: 0이 아닌 경우에만 추가
    if (count > 0) {
      data.push({ date: dateStr, count });
    }
  }
  return data;
};

export const MOCK_ACTIVITY_STREAK: ActivityStreakData[] = generateStreakData();

// 백준 티어 시스템 (문제 난이도)
export type BojTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'ruby';
export type BojTierLevel = 1 | 2 | 3 | 4 | 5;

export const BOJ_TIER_NAMES: Record<BojTier, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  ruby: '루비',
};

export const BOJ_TIER_COLORS: Record<BojTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A8A8',
  gold: '#FFD700',
  platinum: '#00CED1',
  diamond: '#B9F2FF',
  ruby: '#E0115F',
};

// 학습 타임라인 아이템
export interface TimelineItemData {
  submissionId?: number;
  problemId: string;
  title: string;
  tier: BojTier;
  tierLevel: BojTierLevel;
  link: string;
  sources: string[]; // 다중 태그 지원을 위해 배열로 변경
  sourceType: 'study' | 'game' | 'problem';
  tag?: string; // [팀] 게임방 이름 등 (서버에서 받은 태그)
  gameType?: 'team' | 'personal'; // 게임일 경우 팀전/개인전 구분
  language?: string;
  memory?: number;
  executionTime?: number;
  code?: string;
  submittedAt?: string;
  result?: string; // 제출 결과 (맞았습니다, 틀렸습니다, 런타임 에러 등)
}

export const MOCK_TIMELINE: TimelineItemData[] = [
  {
    problemId: '#11687',
    title: '토끼와 산타',
    tier: 'silver',
    tierLevel: 3,
    link: 'https://www.acmicpc.net/problem/11687',
    sources: ['알고스터디'],
    sourceType: 'study',
    code: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    N, M = map(int, input().split())\n    # ... 솔루션 코드 ...\n    print(ans)`,
  },
  {
    problemId: '#14503',
    title: 'DP 기초',
    tier: 'silver',
    tierLevel: 1,
    link: 'https://www.acmicpc.net/problem/14503',
    sources: ['알고리즘 스터디123'],
    sourceType: 'study',
    code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int N, M;\n    cin >> N >> M;\n    // ... DP 로직 ...\n    return 0;\n}`,
  },
  {
    problemId: '#12865',
    title: 'BFS탐색',
    tier: 'gold',
    tierLevel: 5,
    link: 'https://www.acmicpc.net/problem/12865',
    sources: ['알고리즘 스터디123', '스피드 레이스'], // 중복 태그 예시
    sourceType: 'game',
    gameType: 'team',
    code: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    // 평범한 배낭 문제 (Knapsack)\n    return 0;\n}`,
  },
  {
    problemId: '#1003',
    title: '최단 경로 찾기',
    tier: 'platinum',
    tierLevel: 4,
    link: 'https://www.acmicpc.net/problem/1003',
    sources: ['스피드 레이스'],
    sourceType: 'game',
    gameType: 'personal',
    code: `def fibonacci(n):\n    pass`,
  },
  {
    problemId: '#10971',
    title: '그리디 알고리즘',
    tier: 'silver',
    tierLevel: 2,
    link: 'https://www.acmicpc.net/problem/10971',
    sources: ['타임어택'],
    sourceType: 'game',
    gameType: 'team',
    code: `# TSP (외판원 순회) 문제\n// ...`,
  },
  {
    problemId: '#2580',
    title: '스도쿠',
    tier: 'gold',
    tierLevel: 4,
    link: 'https://www.acmicpc.net/problem/2580',
    sources: ['알고스터디'],
    sourceType: 'study',
    code: `// 백트래킹으로 스도쿠 풀기`,
  },
  {
    problemId: '#9663',
    title: 'N-Queen',
    tier: 'gold',
    tierLevel: 4,
    link: 'https://www.acmicpc.net/problem/9663',
    sources: ['스피드 레이스'],
    sourceType: 'game',
    gameType: 'personal',
    code: `def n_queens(i, col):`,
  },
];

// AI 추천 문제
export interface AIRecommendationData {
  problemId: string;
  title: string;
  tier: BojTier;
  tierLevel: BojTierLevel;
  tags: string[];
  reason: string;
}

export const MOCK_AI_RECOMMENDATIONS: AIRecommendationData[] = [
  {
    problemId: '#1149',
    title: 'RGB거리',
    tier: 'silver',
    tierLevel: 1,
    tags: ['다이나믹프로그래밍', 'BFS'],
    reason:
      '최근 DP 문제의 배열을 많이 틀렸던 경험을 가졌고, 이를 해결하기 위해 DP의 배열에 대해 친숙해지고 싶습니다.',
  },
  {
    problemId: '#2178',
    title: '미로 탐색',
    tier: 'silver',
    tierLevel: 1,
    tags: ['그래프탐색', 'BFS'],
    reason: '최근 BFS가 특히 취약하다고 느껴져서 이를 재학습 기회로 다시 공부하는 것을 권장합니다.',
  },
  {
    problemId: '#11053',
    title: '가장 긴 증가하는 부분 수열',
    tier: 'silver',
    tierLevel: 2,
    tags: ['다이나믹프로그래밍'],
    reason: 'LIS 알고리즘에 대한 이해도를 높이면 각종 시퀀스 문제에서 도움이 될 것입니다.',
  },
];

// 주간 점수 데이터
export interface WeeklyScoreData {
  totalScore: number;
  dateRange: string;
  activities: {
    name: string;
    detail: string;
    score: number;
    icon: 'study' | 'game' | 'problem' | 'league';
  }[];
}

// 주간 점수 데이터
export interface WeeklyScoreData {
  totalScore: number;
  date: string; // 시작일
  dateRange: string;
  activities: {
    name: string;
    detail: string;
    score: number;
    icon: 'study' | 'game' | 'problem' | 'league';
  }[];
}

export const MOCK_WEEKLY_SCORES: WeeklyScoreData[] = [
  {
    totalScore: 127,
    date: '2025-01-09',
    dateRange: '1월 9일 ~ 1월 15일',
    activities: [
      { name: 'SSAFY 친목게임', detail: '2시간 전', score: 8, icon: 'game' },
      { name: '2222. 개구쟁이', detail: '2시간 전', score: 8, icon: 'problem' },
      { name: '21234. A+B', detail: '24시간 12시간 전 (2)', score: 8, icon: 'problem' },
      { name: '7팀 종합 1등', detail: '1일 전 / 스터디게임에서', score: 5, icon: 'league' },
    ],
  },
  {
    totalScore: 95,
    date: '2025-01-02',
    dateRange: '1월 2일 ~ 1월 8일',
    activities: [
      { name: '알고리즘 스터디', detail: '3일 전', score: 10, icon: 'study' },
      { name: 'BFS 기초', detail: '4일 전', score: 8, icon: 'problem' },
      { name: 'DP 심화', detail: '5일 전', score: 8, icon: 'problem' },
    ],
  },
  {
    totalScore: 150,
    date: '2024-12-26',
    dateRange: '12월 26일 ~ 1월 1일',
    activities: [
      { name: '연말 특별 게임', detail: '1주 전', score: 20, icon: 'game' },
      { name: '그리디 마스터', detail: '1주 전', score: 15, icon: 'problem' },
    ],
  },
];

// 레거시 지원 (하나만 반환하던 기존 훅을 위해)
export const MOCK_WEEKLY_SCORE = MOCK_WEEKLY_SCORES[0];

// 리그 내 순위 데이터
export interface LeagueRankingMember {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  isMe?: boolean;
}

export interface LeagueRankingData {
  myLeague: LeagueType;
  myRank: number;
  maxLeague?: LeagueType; // 최고 도달 리그
  maxScore?: number; // 최고 도달 점수
  members: LeagueRankingMember[];
}

// 리그별 승급/강등 규칙 (백분율 %)
export interface LeagueRule {
  promotePercent: number; // 상위 P% 승급
  demotePercent: number; // 하위 D% 강등
}

export const LEAGUE_RULES: Record<LeagueType, LeagueRule> = {
  stone: { promotePercent: 40, demotePercent: 0 }, // 상위 40% 승급
  bronze: { promotePercent: 40, demotePercent: 20 }, // 상위 40% 승급, 하위 20% 강등
  silver: { promotePercent: 30, demotePercent: 30 }, // 상위 30% 승급, 하위 30% 강등
  gold: { promotePercent: 30, demotePercent: 30 }, // 상위 30% 승급, 하위 30% 강등
  platinum: { promotePercent: 20, demotePercent: 40 }, // 상위 20% 승급, 하위 40% 강등
  emerald: { promotePercent: 20, demotePercent: 40 }, // 상위 20% 승급, 하위 40% 강등
  diamond: { promotePercent: 10, demotePercent: 50 }, // 상위 10% 승급, 하위 50% 강등
  ruby: { promotePercent: 0, demotePercent: 50 }, // 상위 0% 승급, 하위 50% 강등
};

/**
 * 리그 인원에 따른 승급/강등 커트라인 인원 계산
 * 규칙:
 * 1. N=1이면 변동 없음
 * 2. N>=2이면 유지 인원 최소 1명 보장
 * 3. 비율 적용은 올림(ceil)
 * 4. 우선순위: 승급 -> 강등
 */
export const calculateLeagueCutoffs = (totalMembers: number, rule: LeagueRule) => {
  if (totalMembers <= 1) {
    return { promoteCount: 0, demoteCount: 0 };
  }

  // 1. 승급 인원 계산
  // 승급 = min( ceil(N * P), N - 1 )
  let promoteCount = Math.ceil(totalMembers * (rule.promotePercent / 100));
  promoteCount = Math.min(promoteCount, totalMembers - 1);

  // 2. 강등 인원 계산
  // 강등 = min( ceil(N * D), N - 승급 - 1 )
  let demoteCount = Math.ceil(totalMembers * (rule.demotePercent / 100));
  demoteCount = Math.min(demoteCount, totalMembers - promoteCount - 1);

  return { promoteCount, demoteCount };
};

export const MOCK_LEAGUE_RANKING: LeagueRankingData = {
  myLeague: 'gold',
  myRank: 3,
  maxLeague: 'diamond',
  maxScore: 230,
  members: [
    { rank: 1, name: 'user_1', avatar: '/avatars/default.png', score: 970 },
    { rank: 2, name: '꿈꾸며유영', avatar: '/avatars/default.png', score: 880 },
    { rank: 3, name: '심도랑하이', avatar: '/avatars/default.png', score: 850, isMe: true }, // 나 (승급권)
    { rank: 4, name: 'user_4', avatar: '/avatars/default.png', score: 720 },
    { rank: 5, name: 'user_5', avatar: '/avatars/default.png', score: 680 },
    { rank: 6, name: 'user_6', avatar: '/avatars/default.png', score: 650 },
    { rank: 7, name: 'user_7', avatar: '/avatars/default.png', score: 620 },
    { rank: 8, name: 'user_8', avatar: '/avatars/default.png', score: 580 },
    { rank: 9, name: 'user_9', avatar: '/avatars/default.png', score: 480 },
    { rank: 10, name: 'user_10', avatar: '/avatars/default.png', score: 430 },
  ],
};
