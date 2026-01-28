'use client';

import Link from 'next/link';
import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import LeagueIcon, { LEAGUE_NAMES } from '@/components/LeagueIcon';

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

const MyLeagueCard = () => {
  const { data, isLoading } = useLeagueRanking();

  // 내 정보 찾기
  const myMember = data.members.find((m) => m.me);

  // 상태 매핑
  const getStatus = (status?: string): LeagueInfo['status'] => {
    switch (status) {
      case 'PROMOTE': return 'promotion';
      case 'DEMOTE': return 'demotion';
      default: return 'maintenance';
    }
  };

  const leagueInfo: LeagueInfo = {
    tierName: LEAGUE_NAMES[data.myLeague] || 'Unknown',
    score: myMember?.score || 0,
    rank: data.myRank,
    totalPlayers: data.members.length,
    status: getStatus(myMember?.status),
  };

  const statusMap = {
    promotion: { label: '승급예정', color: 'text-success bg-success/10' },
    maintenance: { label: '유지', color: 'text-muted-foreground bg-muted' },
    demotion: { label: '강등위기', color: 'text-destructive bg-destructive/10' },
  };

  const currentStatus = statusMap[leagueInfo.status];

  if (isLoading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;

  return (
    <Link href="/league" className="block w-full">
      <div className="relative flex items-center gap-3 px-4 py-6 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-all duration-200 shadow-sm">
        {/* 메달 아이콘 */}
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <LeagueIcon league={data.myLeague} size={40} />
        </div>

        {/* 왼쪽: 티어 이름 + 점수 */}
        <div className="flex flex-col flex-1">
          <span className="text-base font-bold text-foreground">{leagueInfo.tierName}</span>
          <span className="text-sm text-muted-foreground font-medium">{leagueInfo.score.toLocaleString()}점</span>
        </div>

        {/* 오른쪽: 승급예정 + 순위 */}
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold -mr-1.5 mt-1',
              currentStatus.color,
            )}
          >
            {currentStatus.label}
          </span>
          <span className="text-[11px] text-muted-foreground/60 mt-0.5 font-medium">
            {leagueInfo.rank}/{leagueInfo.totalPlayers}위
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MyLeagueCard;
