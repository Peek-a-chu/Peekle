import { fetchServer } from '@/lib/serverApi';
import { LeagueType } from '@/components/LeagueIcon';
import {
    LeagueRankingData,
    WeeklyPointSummary,
    LeagueProgressData,
    LeagueStatusResponse,
    BackendRankingMember
} from '@/domains/league/types';

export async function getLeagueStatusServer(): Promise<LeagueRankingData | null> {
    const data = await fetchServer<LeagueStatusResponse>('/api/league/my-status');
    if (!data) return null;

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
}

export async function getWeeklyPointSummaryServer(date?: string): Promise<WeeklyPointSummary | null> {
    const query = date ? `?date=${date}` : '';
    return await fetchServer<WeeklyPointSummary>(`/api/league/weekly-summary${query}`);
}

export async function getLeagueProgressServer(): Promise<LeagueProgressData[]> {
    const data = await fetchServer<LeagueProgressData[]>('/api/league/progress');
    return data || [];
}
