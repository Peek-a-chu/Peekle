import { getLeagueStatusServer, getWeeklyPointSummaryServer } from '@/api/leagueServerApi';
import CCLeagueMyStatus from '@/domains/league/components/CCLeagueMyStatus';
import CCLeagueRankingList from '@/domains/league/components/CCLeagueRankingList';
import { DEFAULT_LEAGUE_RANKING } from '@/domains/league/utils';

export default async function LeaguePage() {
  const [leagueStatus, weeklySummary] = await Promise.all([
    getLeagueStatusServer(),
    getWeeklyPointSummaryServer(),
  ]);

  const finalLeagueStatus = leagueStatus || DEFAULT_LEAGUE_RANKING;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="space-y-6">
          <CCLeagueMyStatus
            initialLeagueRanking={finalLeagueStatus}
            initialWeeklyScore={weeklySummary}
          />
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[600px]">
          <CCLeagueRankingList initialData={finalLeagueStatus} />
        </div>
      </div>
    </div>
  );
}
