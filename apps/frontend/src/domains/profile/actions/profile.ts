import { UserProfile } from '../types';

interface ProfileApiResponse {
  data: {
    id: number;
    nickname: string;
    bojId: string | null;
    leagueName: string;
    score: number;
    streakCurrent: number;
    streakMax: number;
    profileImage: string | null;
    solvedCount: number;
  };
}

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
  profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
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
    profileImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
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

    if (!res.ok) {
      throw new Error(`Failed to fetch profile: ${res.status}`);
    }

    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch profile data');
    }

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
      profileImg: data.profileImg || undefined,
      solvedCount: Number(data.solvedCount),
      isMe: data.me,
    };
  } catch (e) {
    console.error('Failed to fetch profile:', e);
    return MOCK_ME;
  }
}

export async function getUserProfile(nickname: string): Promise<UserProfile> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Cookie'] = `access_token=${accessToken}`;
    }

    // 닉네임은 URL 인코딩 필요
    const encodedNickname = encodeURIComponent(nickname);
    const res = await fetch(`${backendUrl}/api/users/${encodedNickname}/profile`, {
      headers: headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user profile: ${res.status}`);
    }

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse profile response:', text.substring(0, 100)); // Log first 100 chars
      throw new Error('Invalid JSON response');
    }

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Failed to fetch profile data');
    }

    const data = json.data;

    return {
      id: String(data.id),
      nickname: data.nickname,
      bojId: data.bojId,
      league: data.leagueName,
      leaguePoint: Number(data.score),
      leagueGroupId: null,
      streakCurrent: data.streakCurrent,
      streakMax: data.streakMax,
      profileImg: data.profileImg || undefined,
      solvedCount: Number(data.solvedCount),
      isMe: data.me,
    };
  } catch (e) {
    console.error(`Failed to fetch profile for ${nickname}:`, e);
    // 에러 발생 시 Mock 데이터 반환 혹은 에러 처리
    // 여기서는 빈 프로필 반환
    return {
      id: '',
      nickname: nickname,
      bojId: '',
      league: 'Stone',
      leaguePoint: 0,
      leagueGroupId: null,
      streakCurrent: 0,
      streakMax: 0,
      profileImg: undefined,
      solvedCount: 0,
    }
  );
}
