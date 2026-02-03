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
    <div className="bg-background text-foreground p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* 벤또 그리드 레이아웃 - Home과 유사한 2컬럼 구조 */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
          {/* 왼쪽: 내 상태 카드 (Sticky Removed) */}
          <div className="space-y-6">
            <CCLeagueMyStatus
              initialLeagueRanking={finalLeagueStatus}
              initialWeeklyScore={weeklySummary}
            />
          </div>

          {/* 오른쪽: 전체 랭킹 리스트 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[600px]">
            <CCLeagueRankingList initialData={finalLeagueStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
