'use client';

import { Trophy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LeagueIcon, { LEAGUE_NAMES, LEAGUE_COLORS } from '@/components/LeagueIcon';
import { useLeagueRanking } from '../hooks/useDashboardData';
import { UserIcon } from '@/components/UserIcon';
// import defaultProfileImg from '@/assets/icons/profile.png';

import { LeagueRankingData } from '@/domains/league/types';

interface LeagueRankingProps {
  initialData?: LeagueRankingData;
}

const LeagueRanking = ({ initialData }: LeagueRankingProps) => {
  const { data: fetchedData } = useLeagueRanking(30000, { skip: !!initialData });
  const data = initialData || fetchedData;

  // 현재 리그의 승급/강등 규칙 가져오기
  const rules = data.rule;

  // 그룹 나누기
  const promotionZone = data.members.filter((m) => m.status === 'PROMOTE');
  const maintenanceZone = data.members.filter((m) => m.status === 'STAY');
  const demotionZone = data.members.filter((m) => m.status === 'DEMOTE');

  return (
    <div className="bg-card border border-border rounded-2xl p-3 shadow-sm h-full flex flex-col transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="font-bold text-sm text-foreground">리그 랭킹</h3>
        </div>
      </div>

      {/* 내 순위 요약 카드 - Borderless, uses surface elevation only */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl shadow-sm">
          {/* 우측 상단 리그 정보 (태그 형식) */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                color: 'hsl(var(--primary))',
                backgroundColor: 'hsl(var(--primary) / 0.08)',
              }}
            >
              {LEAGUE_NAMES[data.myLeague]} 리그
            </span>
          </div>

          {/* 왼쪽 내용: 아이콘 + 순위 */}
          <div className="flex items-center gap-3">
            <LeagueIcon league={data.myLeague} size={40} />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-primary block mb-0">
                나의 현재 순위
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-primary tracking-tight">
                  {data.myRank}위
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  / {data.members.length}명
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 순위 목록 - Borderless containers, rely on bg-surface-2 */}
      <div className="flex-1 pr-1 -mr-1 custom-scrollbar overflow-y-auto space-y-2">
        {/* 1. 승급 구간 */}
        {promotionZone.length > 0 && (
          <div className="rounded-xl bg-surface-2 overflow-hidden">
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

        {/* 2. 유지 구간 */}
        {maintenanceZone.length > 0 && (
          <div className="rounded-xl bg-surface-2">
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

        {/* 3. 강등 구간 */}
        {demotionZone.length > 0 && (
          <div className="rounded-xl bg-surface-2 overflow-hidden">
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
const RankingItem = ({ member }: { member: any }) => {
  const isMe = member.me;

  // 내 행 - Left accent bar + very subtle background
  const rowClass = isMe
    ? 'bg-surface-3/40 border-l-[3px] border-l-primary border-y-transparent border-r-transparent pl-[calc(0.5rem-3px)] pr-2'
    : 'hover:bg-surface-3/50 border-transparent px-2 transition-colors';

  return (
    <div
      className={`
                relative flex items-center py-1.5 transition-all 
                border-t border-t-white/[0.02] first:border-t-0
                ${rowClass}
            `}
    >
      {/* 1. 랭크 */}
      <div className="w-6 flex items-center justify-center shrink-0">
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
          size={24}
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
      <div className="shrink-0 w-14 text-right">
        <span
          className={`text-xs font-bold tabular-nums tracking-tight ${isMe ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {member.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default LeagueRanking;
