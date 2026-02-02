import { ApiResponse } from '@/api/userApi';
import { LeagueRankingData, LeagueRankingMember, LeagueStat } from '@/domains/league/types';
import { LeagueType } from '@/components/LeagueIcon';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// Backend DTO matches this structure
export interface BackendRankingMember {
  rank: number;
  name: string;
  avatar: string;
  profileImgThumb: string;
  score: number;
  me: boolean;
  status: 'PROMOTE' | 'STAY' | 'DEMOTE';
}

export interface LeagueStatusResponse {
  myLeague: string;
  myRank: number;
  myScore: number;
  maxLeague: string;
  totalMembers: number;
  promotePercent: number;
  demotePercent: number;
  myPercentile: number;
  leagueStats: LeagueStat[];
  members: BackendRankingMember[];
}

export async function getLeagueStatus(): Promise<LeagueRankingData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/my-status`, {
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch league status');
    }

    const json: ApiResponse<LeagueStatusResponse> = await res.json();

    if (!json.success || !json.data) {
      return null;
    }

    const data = json.data;

    // Backend Response -> Frontend Data Mapping
    return {
      myLeague: data.myLeague as LeagueType,
      myRank: data.myRank,
      myScore: data.myScore,
      maxLeague: (data.maxLeague as LeagueType) || undefined,
      members: data.members.map((m: BackendRankingMember) => ({
        rank: m.rank,
        name: m.name,
        avatar: m.avatar,
        profileImgThumb: m.profileImgThumb,
        score: m.score,
        me: m.me,
        status: m.status,
      })),
      rule: {
        promotePercent: data.promotePercent,
        demotePercent: data.demotePercent,
      },
      myPercentile: data.myPercentile,
      leagueStats: data.leagueStats,
    };
  } catch (error) {
    console.error('Error fetching league status:', error);
    return null;
  }
}

export type LeagueRulesMap = Record<string, { promotePercent: number; demotePercent: number }>;

export async function getLeagueRules(): Promise<LeagueRulesMap | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/rules`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch league rules');
    const json: ApiResponse<LeagueRulesMap> = await res.json();
    return json.data || null;
  } catch (error) {
    console.error('Error fetching league rules:', error);
    return null;
  }
}
export interface PointActivity {
  description: string;
  amount: number;
  createdAt: string;
  category?: 'PROBLEM' | 'GAME' | 'STUDY' | string; // Enum from backend
}

export interface WeeklyPointSummary {
  totalScore: number;
  startDate: string;
  endDate: string;
  activities: PointActivity[];
}

export async function getWeeklyPointSummary(date?: string): Promise<WeeklyPointSummary | null> {
  try {
    const query = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE_URL}/api/league/weekly-summary${query}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch weekly summary');
    const json: ApiResponse<WeeklyPointSummary> = await res.json();
    return json.data || null;
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    return null;
  }
}

export interface LeagueProgressData {
  league: LeagueType;
  score: number;
  date: string;
  periodEnd: string;
  leagueIndex: number;
}

export async function getLeagueProgress(): Promise<LeagueProgressData[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/progress`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch league progress');
    const json: ApiResponse<LeagueProgressData[]> = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching league progress:', error);
    return [];
  }
}
export interface LeagueHistoryResponse {
  id: number;
  league: LeagueType;
  finalPoint: number;
  result: 'PROMOTED' | 'DEMOTED' | 'STAY' | 'MAINTAINED';
  seasonWeek: number;
  rank: number;
  currentLeague: LeagueType;
}

export async function getUnviewedLeagueHistory(): Promise<LeagueHistoryResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/history/unviewed`, {
      credentials: 'include',
    });
    // 404 means no unviewed history, which is fine
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch unviewed history');

    const json: ApiResponse<LeagueHistoryResponse> = await res.json();
    return json.success && json.data ? json.data : null;
  } catch (error) {
    console.warn('Checking unviewed history:', error);
    return null;
  }
}

export async function markLeagueHistoryAsViewed(historyId: number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/history/${historyId}/view`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to mark history as viewed');
  } catch (error) {
    console.error('Error marking history as viewed:', error);
  }
}

export async function getLeagueHistoryRanking(historyId: number): Promise<BackendRankingMember[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/league/history/${historyId}/ranking`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch history ranking');
    const json: ApiResponse<BackendRankingMember[]> = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching history ranking:', error);
    return [];
  }
}
