'use client';

import Link from 'next/link';
import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeagueInfo {
  tierName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  status: 'promotion' | 'maintenance' | 'demotion';
}

const MyLeagueCard = () => {
  // Mock data matching the image somewhat
  const leagueInfo: LeagueInfo = {
    tierName: 'Gold',
    score: 847,
    rank: 3,
    totalPlayers: 10,
    status: 'promotion', // Green badge
  };

  const statusMap = {
    promotion: { label: '승급예정', color: 'text-success bg-success/10' },
    maintenance: { label: '유지', color: 'text-muted-foreground bg-muted' },
    demotion: { label: '강등위기', color: 'text-destructive bg-destructive/10' },
  };

  const currentStatus = statusMap[leagueInfo.status];

  return (
    <Link href="/league" className="block w-full">
      <div className="relative flex items-center gap-3 px-4 py-6 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-all duration-200 shadow-sm">
        {/* 메달 아이콘 */}
        <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-900/30 flex items-center justify-center shrink-0 shadow-inner">
          <Medal className="w-4 h-4 text-amber-600 dark:text-amber-500 fill-amber-500/50" />
        </div>

        {/* 왼쪽: 티어 이름 + 점수 */}
        <div className="flex flex-col flex-1">
          <span className="text-base font-bold text-foreground">{leagueInfo.tierName}</span>
          <span className="text-sm text-muted-foreground font-medium">{leagueInfo.score}점</span>
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
