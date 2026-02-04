'use client';

import Link from 'next/link';
import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import LeagueIcon from '@/components/LeagueIcon';

interface LeagueInfo {
  tierName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  status: 'promotion' | 'maintenance' | 'demotion';
}

import { useLeagueRanking } from '@/domains/home/hooks/useDashboardData';

interface LeagueInfo {
  tierName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  status: 'promotion' | 'maintenance' | 'demotion';
}

interface Props {
  initialTier?: string;
  initialScore?: number;
}

const MyLeagueCard = ({ initialTier, initialScore }: Props) => {
  // Poll every 30 seconds
  const { data, isLoading } = useLeagueRanking(30000);

  // 내 정보 찾기
  const myMember = data.members.find((m) => m.me);

  // 상태 매핑
  const getStatus = (status?: string): LeagueInfo['status'] => {
    switch (status) {
      case 'PROMOTE':
        return 'promotion';
      case 'DEMOTE':
        return 'demotion';
      default:
        return 'maintenance';
    }
  };

  const statusMap = {
    promotion: { label: '승급예정', color: 'text-success bg-success/10' },
    maintenance: { label: '유지', color: 'text-muted-foreground bg-muted' },
    demotion: { label: '강등위기', color: 'text-destructive bg-destructive/10' },
  };

  // Determine what to show
  // Logic:
  // 1. If loading and have initial props -> Show initial props, loading for rank
  // 2. If loading and NO initial props -> Show full skeleton
  // 3. If loaded -> Show full fetched data

  const showSkeleton = isLoading && !initialTier;
  const showInitial = isLoading && !!initialTier;

  // Values to display
  const displayLeague = showInitial ? (initialTier as any) : data.myLeague;

  // Convert league to Uppercase (e.g. "bronze" -> "BRONZE")
  const formatLeagueName = (league: string | undefined) => {
    if (!league || league === 'Unknown') return 'UR';
    return league.toUpperCase();
  };

  const displayTierName = formatLeagueName(displayLeague);
  const displayScore = showInitial ? initialScore || 0 : myMember?.score || 0;

  // Rank/Status info (only available when loaded)
  const displayRank = !isLoading ? data.myRank : 0;
  const displayTotal = !isLoading ? data.members.length : 0;
  const displayStatusKey = !isLoading ? getStatus(myMember?.status) : 'maintenance';
  const displayStatus = statusMap[displayStatusKey];

  if (showSkeleton) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;

  return (
    <Link href="/league" className="block w-full">
      <div className="relative flex items-center gap-3 px-4 py-6 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-all duration-200 shadow-sm">
        {/* 메달 아이콘 */}
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <LeagueIcon league={displayLeague} size={40} />
        </div>

        {/* 왼쪽: 티어 이름 + 점수 */}
        <div className="flex flex-col flex-1">
          <span className="text-base font-bold text-foreground">{displayTierName}</span>
          <span className="text-sm text-muted-foreground font-medium">
            {displayScore.toLocaleString()}점
          </span>
        </div>

        {/* 오른쪽: 승급예정 + 순위 */}
        <div className="flex flex-col items-end">
          {isLoading ? (
            // fetching rank...
            <div className="flex flex-col items-end gap-1">
              <div className="w-10 h-3 bg-muted rounded animate-pulse" />
              <div className="w-8 h-2 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold -mr-1.5 mt-1',
                  displayStatus.color,
                )}
              >
                {displayStatus.label}
              </span>
              <span className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">
                {displayRank}/{displayTotal}위
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MyLeagueCard;
