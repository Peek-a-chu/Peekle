import { LeagueType } from '@/components/LeagueIcon';

export interface LeagueRankingMember {
    rank: number;
    name: string;
    avatar: string;
    profileImgThumb?: string;
    score: number;
    me?: boolean;
    status: 'PROMOTE' | 'STAY' | 'DEMOTE';
}

export interface LeagueRule {
    promotePercent: number;
    demotePercent: number;
}

export interface LeagueStat {
    tier?: string; // e.g. "gold"
    averageScore: number;
    myScore: number;
    topScore: number;
    myPercentile: number;
    percentile?: number; // Generic percentile for the league
}

export interface LeagueRankingData {
    myLeague: LeagueType;
    myRank: number;
    myScore: number;
    maxLeague?: LeagueType;
    members: LeagueRankingMember[];
    rule: LeagueRule;
    myPercentile: number;
    leagueStats: LeagueStat[];
}
