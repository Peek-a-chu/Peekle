import { ApiResponse } from '@/types/apiUtils';
import { apiFetch } from '@/lib/api';
import {
  LeagueRankingData,
  LeagueRankingMember,
  LeagueStat,
  WeeklyPointSummary,
  LeagueProgressData,
} from '@/domains/league/types';
import { LeagueType } from '@/components/LeagueIcon';

// Backend DTO matches this structure
export interface BackendRankingMember {
  rank: number;
  name: string;
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
    const res = await apiFetch<LeagueStatusResponse>('/api/league/my-status');

    if (!res.success || !res.data) {
      return null;
    }

    const data = res.data;

    // Backend Response -> Frontend Data Mapping
    return {
      myLeague: data.myLeague as LeagueType,
      myRank: data.myRank,
      myScore: data.myScore,
      maxLeague: (data.maxLeague as LeagueType) || undefined,
      members: data.members.map((m: BackendRankingMember) => ({
        rank: m.rank,
        name: m.name,
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
    const res = await apiFetch<LeagueRulesMap>('/api/league/rules');
    return res.data || null;
  } catch (error) {
    console.error('Error fetching league rules:', error);
    return null;
  }
}

export async function getWeeklyPointSummary(date?: string): Promise<WeeklyPointSummary | null> {
  try {
    const query = date ? `?date=${date}` : '';
    const res = await apiFetch<WeeklyPointSummary>(`/api/league/weekly-summary${query}`);
    return res.data || null;
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    return null;
  }
}

// Client-side wrappers using apiFetch for consistency if used in components
// Note: LeagueProgress and History might be used in Server Components often,
// but if used in Client Components, this version is better.
// If you specifically need Server Component fetching, use leagueServerApi.ts instead of this file.

export async function getLeagueProgress(): Promise<LeagueProgressData[]> {
  try {
    const res = await apiFetch<LeagueProgressData[]>('/api/league/progress');
    return res.data || [];
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
    const res = await apiFetch<LeagueHistoryResponse>('/api/league/history/unviewed');
    // apiFetch usually throws or returns success:false if 404 depending on impl,
    // assuming backend returns 200 with null or 404 error.
    // If backend returns 404, apiFetch might throw. Ideally handle it.
    if (!res.success) return null;
    return res.data;
  } catch (error) {
    // console.warn('Checking unviewed history:', error);
    return null;
  }
}

export async function markLeagueHistoryAsViewed(historyId: number): Promise<void> {
  try {
    await apiFetch(`/api/league/history/${historyId}/view`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('Error marking history as viewed:', error);
  }
}

export async function getLeagueHistoryRanking(historyId: number): Promise<BackendRankingMember[]> {
  try {
    const res = await apiFetch<BackendRankingMember[]>(`/api/league/history/${historyId}/ranking`);
    return res.data || [];
  } catch (error) {
    console.error('Error fetching history ranking:', error);
    return [];
  }
}
