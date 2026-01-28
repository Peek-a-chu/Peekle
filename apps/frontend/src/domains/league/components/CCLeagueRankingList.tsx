'use client';

import { TrendingUp, TrendingDown, GripHorizontal, Minus } from 'lucide-react';
import Image from 'next/image';
import { useLeagueRanking } from '@/domains/home/hooks/useDashboardData';
import { LeagueRankingMember } from '@/domains/league/types';
import { LEAGUE_NAMES } from '@/components/LeagueIcon';
import { format, startOfWeek, addDays } from 'date-fns';

// 이번 주 리그 기간 문자열 반환 (수요일 06:00 기준)
const getLeaguePeriodString = () => {
  const getNextWednesday0600KST = () => {
    const now = new Date();
    // UTC 기준 (+9h) 수요일 06:00 계산 로직
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = now.getTime() + kstOffset;
    const kstDate = new Date(kstTime);

    const day = kstDate.getUTCDay();
    const hour = kstDate.getUTCHours();

    let daysUntilWed = (3 - day + 7) % 7;

    if (day === 3) {
      if (hour < 6) daysUntilWed = 0;
      else daysUntilWed = 7;
    } else if (daysUntilWed === 0) {
      daysUntilWed = 7;
    }

    const targetKST = new Date(kstDate);
    targetKST.setUTCDate(kstDate.getUTCDate() + daysUntilWed);
    targetKST.setUTCHours(6, 0, 0, 0);

    return new Date(targetKST.getTime() - kstOffset);
  };

  const targetDate = getNextWednesday0600KST();
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 7);

  const formatDate = (date: Date) => {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  return `${formatDate(startDate)} 06:00 ~ ${formatDate(targetDate)} 06:00`;
};

const CCLeagueRankingList = () => {
  const { data, isLoading } = useLeagueRanking();

  if (isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        리그 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!data.members || data.members.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        리그 멤버 정보가 없습니다.
      </div>
    );
  }

  // 그룹 나누기 (Backend에서 status 필드로 구분됨)
  const promotionZone = data.members.filter((m) => m.status === 'PROMOTE');
  const maintenanceZone = data.members.filter((m) => m.status === 'STAY');
  const demotionZone = data.members.filter((m) => m.status === 'DEMOTE');

  return (
    <div className="h-full flex flex-col">
      {/* 상단 정보 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-muted-foreground font-bold text-sm">
          {LEAGUE_NAMES[data.myLeague]} 리그 순위
        </h3>
        {/* 리그 기간 */}
        <span className="text-[10px] text-muted-foreground font-medium bg-secondary/50 px-2 py-0.5 rounded-full">
          {getLeaguePeriodString()}
        </span>
      </div>

      {/* 랭킹 리스트 컨테이너 */}
      <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar">
        {/* 1. 승급 구간 */}
        {promotionZone.length > 0 && (
          <RankingSection
            title="승급 구간"
            subtitle={`상위권`}
            icon={<TrendingUp className="w-3 h-3 text-green-500" />}
            members={promotionZone}
            type="promotion"
          />
        )}

        {/* divider */}
        {maintenanceZone.length > 0 && <div className="h-[1px] bg-border/40 mx-2 my-1" />}

        {/* 2. 유지 구간 */}
        {maintenanceZone.length > 0 && (
          <RankingSection
            title="유지 구간"
            subtitle={`중위권`}
            icon={<GripHorizontal className="w-3 h-3 text-gray-400" />}
            members={maintenanceZone}
            type="maintenance"
          />
        )}

        {/* divider */}
        {demotionZone.length > 0 && <div className="h-[1px] bg-border/40 mx-2 my-1" />}

        {/* 3. 강등 구간 */}
        {demotionZone.length > 0 && (
          <RankingSection
            title="강등 구간"
            subtitle={`하위권`}
            icon={<TrendingDown className="w-3 h-3 text-red-500" />}
            members={demotionZone}
            type="demotion"
          />
        )}
      </div>
    </div>
  );
};

// 하위 섹션 컴포넌트
interface RankingSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  members: LeagueRankingMember[];
  type: 'promotion' | 'maintenance' | 'demotion';
}

const RankingSection = ({ title, subtitle, icon, members, type }: RankingSectionProps) => {
  // 내 행 하이라이트 스타일
  const getMyRowStyle = (isMe: boolean) => {
    if (!isMe) return 'hover:bg-muted/30 border-transparent';
    return 'bg-primary/5 border-l-2 border-l-primary border-y-transparent border-r-transparent pl-[calc(0.5rem-2px)]';
  };

  // 존별 스타일
  const getZoneContainerStyle = () => {
    switch (type) {
      case 'promotion':
        return 'bg-green-500/5 border border-green-500/10';
      case 'demotion':
        return 'bg-red-500/5 border border-red-500/10';
      default:
        return 'border border-transparent'; // 유지 구간은 투명
    }
  };

  return (
    <div className={`space-y-1 rounded-lg p-1.5 transition-colors ${getZoneContainerStyle()}`}>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-1 py-0.5 mb-1 bg-transparent rounded-md">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <span className="text-[9px] text-muted-foreground/60 font-medium">{subtitle}</span>
      </div>

      {/* 리스트 아이템 */}
      <div className="space-y-0.5">
        {members.map((member) => (
          <div
            key={member.rank}
            className={`
                            relative flex items-center py-1 px-2 rounded-md transition-all border group
                            ${getMyRowStyle(member.me || false)}
                            ${!member.me ? 'bg-background/50' : ''} 
                        `}
          >
            {/* 1. 랭크 */}
            <div className="w-6 flex items-center gap-0.5 shrink-0">
              <span
                className={`text-[11px] font-bold tabular-nums ${member.me ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {member.rank}
              </span>
            </div>

            {/* 2. 아바타 */}
            <div className="shrink-0 mr-2">
              <div
                className={`w-5 h-5 rounded-full overflow-hidden bg-muted flex items-center justify-center border ${member.me ? 'border-primary/30' : 'border-border'}`}
              >
                {member.avatar || member.profileImgThumb ? (
                  <Image
                    src={member.profileImgThumb || member.avatar || '/avatars/default.png'}
                    alt={member.name}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : null}
                <span className="text-[8px] font-bold text-muted-foreground uppercase absolute">
                  {member.name.substring(0, 1)}
                </span>
              </div>
            </div>

            {/* 3. 닉네임 */}
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <span
                className={`text-xs truncate ${member.me ? 'text-foreground font-bold' : 'text-foreground/90'}`}
              >
                {member.name}
              </span>
              {member.me && <span className="shrink-0 w-1 h-1 rounded-full bg-primary" />}
            </div>

            {/* 4. 점수 */}
            <div className="shrink-0 w-12 text-right">
              <span
                className={`text-[11px] font-bold tabular-nums tracking-tight ${member.me ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {member.score.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CCLeagueRankingList;
