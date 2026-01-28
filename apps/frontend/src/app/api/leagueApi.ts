import { ApiResponse } from '@/api/userApi';
import { LeagueRankingData, LeagueRankingMember, LeagueStat } from '@/domains/league/types';
import { LeagueType } from '@/components/LeagueIcon';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// Backend DTO matches this structure
interface BackendRankingMember {
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
