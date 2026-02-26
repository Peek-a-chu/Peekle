import { cookies } from 'next/headers';
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

export async function getMyProfile(): Promise<UserProfile> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Cookie'] = `access_token=${accessToken}`;
    }

    const res = await fetch(`${backendUrl}/api/users/me/profile`, {
      headers,
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
    // 에러 발생 시 빈 프로필 반환
    return {
      id: '',
      nickname: '알 수 없음',
      bojId: null,
      league: 'Unranked',
      leaguePoint: 0,
      leagueGroupId: null,
      streakCurrent: 0,
      streakMax: 0,
      profileImg: undefined,
      solvedCount: 0,
      isMe: true,
    };
  }
}

export async function getUserProfile(nickname: string): Promise<UserProfile | null> {
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
      if (res.status === 404) {
        throw new Error('404');
      }
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
      profileImgThumb: data.profileImgThumb || undefined,
      solvedCount: Number(data.solvedCount),
      isMe: data.me,
    };
  } catch (e: any) {
    if (e.message && e.message.includes('404')) {
      return null; // Return null for 404
    }
    console.error(`Failed to fetch profile for ${nickname}:`, e);
    return null; // Return null for other errors too to show error page? Or keep dummy?
    // User wants error page. So let's return null.
  }
}
