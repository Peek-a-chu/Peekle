import CCLeagueMyStatus from '@/domains/league/components/CCLeagueMyStatus';
import CCLeagueRankingList from '@/domains/league/components/CCLeagueRankingList';

export default function LeaguePage() {
  return (
    <div className="bg-background text-foreground p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* 벤또 그리드 레이아웃 - Home과 유사한 2컬럼 구조 */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
          {/* 왼쪽: 내 상태 카드 (Sticky Removed) */}
          <div className="space-y-6">
            x
            <CCLeagueMyStatus />
          </div>

          {/* 오른쪽: 전체 랭킹 리스트 */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm min-h-[600px]">
            <CCLeagueRankingList />
          </div>
        </div>
      </div>
    </div>
  );
}
