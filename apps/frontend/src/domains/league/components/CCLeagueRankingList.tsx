'use client';

import { TrendingUp, TrendingDown, GripHorizontal, Minus } from 'lucide-react';
import Image from 'next/image';
import { UserIcon } from '@/components/UserIcon';
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
  // 그룹 나누기
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
        <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
          {getLeaguePeriodString()}
        </span>
      </div>

      {/* 랭킹 리스트 컨테이너 */}
      <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {/* 1. 승급 구간 (컨테이너 배경) */}
        {promotionZone.length > 0 && (
          <div className="rounded-xl border border-green-500/10 bg-green-500/5 overflow-hidden">
            {promotionZone.map((member) => (
              <RankingItem key={member.rank} member={member} />
            ))}
          </div>
        )}

        {/* 승급 구분선 */}
        {promotionZone.length > 0 && (maintenanceZone.length > 0 || demotionZone.length > 0) && (
          <div className="flex items-center gap-2 px-1">
            <div className="h-[1px] flex-1 bg-green-500/20"></div>
            <span className="text-[10px] text-green-500 font-medium">승급</span>
            <div className="h-[1px] flex-1 bg-green-500/20"></div>
          </div>
        )}

        {/* 2. 유지 구간 (배경 없음/기본) */}
        {maintenanceZone.length > 0 && (
          <div className="rounded-xl border border-transparent">
            {maintenanceZone.map((member) => (
              <RankingItem key={member.rank} member={member} />
            ))}
          </div>
        )}

        {/* 강등 구분선 */}
        {(promotionZone.length > 0 || maintenanceZone.length > 0) && demotionZone.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <div className="h-[1px] flex-1 bg-red-500/20"></div>
            <span className="text-[10px] text-red-500 font-medium">강등</span>
            <div className="h-[1px] flex-1 bg-red-500/20"></div>
          </div>
        )}

        {/* 3. 강등 구간 (컨테이너 배경) */}
        {demotionZone.length > 0 && (
          <div className="rounded-xl border border-red-500/10 bg-red-500/5 overflow-hidden">
            {demotionZone.map((member) => (
              <RankingItem key={member.rank} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 개별 아이템 컴포넌트
const RankingItem = ({ member }: { member: LeagueRankingMember }) => {
  const isMe = member.me;

  // 유저가 원한 예전 스타일 복원
  const rowClass = isMe
    ? 'bg-primary/5 border-l-2 border-l-primary border-y-transparent border-r-transparent pl-[calc(0.75rem-2px)] pr-3'
    : 'hover:bg-muted/30 border-transparent px-3';

  return (
    <div
      className={`
                relative flex items-center py-2 transition-all border-b last:border-b-0
                ${rowClass}
            `}
    >
      {/* 1. 랭크 */}
      <div className="w-8 flex items-center justify-center shrink-0">
        <span
          className={`text-xs font-bold tabular-nums ${isMe ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {member.rank}
        </span>
      </div>

      {/* 2. 아바타 & 닉네임 */}
      <div className="flex-1 flex items-center gap-2 ml-1 min-w-0">
        <UserIcon
          src={member.profileImgThumb}
          nickname={member.name}
          size={28}
          className={isMe ? 'border-primary/30' : 'border-border'}
        />

        <div className="flex items-center min-w-0 justify-center gap-1">
          <span
            className={`text-xs truncate leading-none ${isMe ? 'text-foreground font-bold' : 'text-foreground/90'}`}
          >
            {member.name}
          </span>
          {isMe && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
        </div>
      </div>

      {/* 3. 점수 */}
      <div className="shrink-0 w-20 text-right">
        <span
          className={`text-sm font-bold tabular-nums tracking-tight ${isMe ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {member.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default CCLeagueRankingList;
