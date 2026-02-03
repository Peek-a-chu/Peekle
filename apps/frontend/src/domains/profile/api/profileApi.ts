import { apiFetch } from '@/lib/api';
import { UserProfile } from '@/domains/profile/types';

export interface TimelineItem {
  submissionId: number;
  problemId: string;
  title: string;
  tier: string;
  tierLevel?: number;
  link: string;
  tag?: string;
  sourceType: 'EXTENSION' | 'STUDY' | 'GAME';
  language: string;
  memory: number;
  executionTime: number;
  submittedAt: string;
}

export interface ActivityStreak {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SubmissionHistoryItem {
  id: number;
  problemId: string; // Changed to string to match backend (externalId)
  problemTitle: string;
  tier: string;
  language: string;
  memory: string; // Formatted "3120KB"
  time: string; // Formatted "40ms"
  isSuccess: boolean;
  timestamp: string; // Formatted
  sourceType: 'SOLO' | 'STUDY' | 'GAME';
  sourceDetail?: string;
  code?: string;
}

export interface SubmissionHistoryResponse {
  content: SubmissionHistoryItem[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  number: number; // Current Page
}

export async function fetchDailyActivities(date: Date): Promise<TimelineItem[]> {
  const dateStr = date.toISOString().split('T')[0];
  const res = await apiFetch<TimelineItem[]>(`/api/users/me/timeline?date=${dateStr}`);

  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch timeline');
  }

  return res.data;
}

export async function fetchMonthlyStreaks(): Promise<ActivityStreak[]> {
  const res = await apiFetch<ActivityStreak[]>(`/api/users/me/streak`);

  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch streaks');
  }

  return res.data;
}

export async function fetchMySubmissions(page = 0, size = 20): Promise<SubmissionHistoryResponse> {
  // New Endpoint likely at /api/users/me/history
  const res = await apiFetch<any>(`/api/users/me/history?page=${page}&size=${size}`);

  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch submissions');
  }

  // Transform backend response to frontend interface if needed
  // Backend returns Page<SubmissionLogResponse> or similar
  // Let's assume we map it here or backend returns directly usable DTO
  // Here I assume raw mapping for now, will refine after backend impl
  const content = res.data.content.map((item: any) => ({
    id: item.submissionId || item.id,
    problemId: item.problemId || item.externalId,
    problemTitle: item.problemTitle || item.title,
    tier: item.tier || item.problemTier,
    language: item.language,
    memory: `${item.memory}KB`,
    time: `${item.executionTime}ms`,
    isSuccess: true, // Assuming log stores successful ones mostly, or check item.success
    timestamp: new Date(item.submittedAt).toLocaleString(),
    sourceType: item.sourceType === 'EXTENSION' ? 'SOLO' : item.sourceType,
    sourceDetail: item.tag,
    code: item.code,
  }));

  return {
    content,
    totalPages: res.data.totalPages,
    totalElements: res.data.totalElements,
    last: res.data.last,
    number: res.data.number,
  };
}

export async function fetchUserProfile(nickname: string): Promise<UserProfile> {
  const res = await apiFetch<any>(`/api/users/${encodeURIComponent(nickname)}/profile`);

  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch user profile');
  }

  const data = res.data;
  return {
    id: String(data.id),
    nickname: data.nickname,
    bojId: data.bojId,
    league: data.leagueName,
    leaguePoint: Number(data.score),
    streakCurrent: data.streakCurrent,
    streakMax: data.streakMax,
    profileImg: data.profileImg,
    profileImgThumb: data.profileImgThumb,
    solvedCount: Number(data.solvedCount),
    isMe: data.me,
    leagueGroupId: data.leagueGroupId,
  };
}
