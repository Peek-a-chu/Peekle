import { LeagueRankingData } from './types';

export const DEFAULT_LEAGUE_RANKING: LeagueRankingData = {
  myLeague: 'stone',
  myRank: 0,
  myScore: 0,
  members: [],
  rule: { promotePercent: 0, demotePercent: 0 },
  myPercentile: 0,
  leagueStats: [],
};
