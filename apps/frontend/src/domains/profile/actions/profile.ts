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
  },
};

export async function getMyProfile(): Promise<UserProfile> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_ME;
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
    }
  );
}
