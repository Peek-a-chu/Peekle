import { UserProfile } from '../types';

// Mock Data
const MOCK_ME: UserProfile = {
  id: '1',
  nickname: '나의 계정',
  bojId: 'my_boj_handle',
  league: 'Silver',
  leaguePoint: 1250,
  leagueGroupId: '100',
  streakCurrent: 5,
  streakMax: 12,
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  solvedCount: 156,
};

const MOCK_OTHERS: Record<string, UserProfile> = {
  '1': {
    id: '2',
    nickname: '다른 유저',
    bojId: 'other_boj',
    league: 'Gold',
    leaguePoint: 2100,
    leagueGroupId: '101',
    streakCurrent: 42,
    streakMax: 42,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    solvedCount: 320,
  },
};

export async function getMyProfile(): Promise<UserProfile> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
    const res = await fetch(`${backendUrl}/api/users/me/profile`, {
      headers: {
        'X-Peekle-Token': 'default-token-for-user-1', // 임시 토큰
      },
      next: { revalidate: 0 },
    });
    const json = await res.json();
    const data = json.data;

    return {
      id: String(data.id),
      nickname: data.nickname,
      bojId: data.bojId,
      league: data.leagueName,
      leaguePoint: Number(data.score),
      leagueGroupId: null, // 추후 구현
      streakCurrent: data.streakCurrent,
      streakMax: data.streakMax,
      avatarUrl: data.profileImage || undefined,
      solvedCount: Number(data.solvedCount),
    };
  } catch (e) {
    console.error('Failed to fetch profile:', e);
    return MOCK_ME;
  }
}

export async function getUserProfile(id: string): Promise<UserProfile> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    MOCK_OTHERS[id] || {
      ...MOCK_ME,
      id,
      nickname: `User ${id}`,
      bojId: null,
      league: 'Bronze',
      leaguePoint: 0,
      leagueGroupId: null,
      streakCurrent: 0,
      streakMax: 0,
      avatarUrl: undefined,
      solvedCount: 0,
    }
  );
}
