'use client';

import { Trophy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import LeagueIcon, { LEAGUE_NAMES, LEAGUE_COLORS } from '@/components/LeagueIcon';
import { useLeagueRanking } from '../hooks/useDashboardData';

const LeagueRanking = () => {
  const { data } = useLeagueRanking();

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

      {/* 내 순위 요약 카드 (네온 글로우 버전) */}
      <div className="relative mb-4 group">
        {/* 1. 뒤에서 빛이 번지는 효과 (Glow Layer) */}
        <div className="absolute -inset-[1px] bg-primary rounded-xl blur-[2px] opacity-70"></div>

        {/* 2. 실제 카드 레이어 */}
        <div className="relative flex items-center justify-between p-3 bg-card rounded-xl leading-none border border-black/5 dark:border-white/10 shadow-lg font-sans">
          {/* 우측 상단 리그 정보 (태그 형식) */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm"
              style={{
                color: 'hsl(var(--primary))',
                backgroundColor: 'hsl(var(--primary) / 0.05)',
                borderColor: 'hsl(var(--primary) / 0.2)',
              }}
            >
              {LEAGUE_NAMES[data.myLeague]} 리그
            </span>
          </div>

          {/* 왼쪽 내용: 아이콘 + 순위 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* 아이콘 뒤에도 미세한 광채 추가 */}
              <div className="absolute inset-0 bg-primary/20 blur-md rounded-full"></div>
              <LeagueIcon league={data.myLeague} size={40} className="relative z-10" />
            </div>
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

      {/* 순위 목록 (스크롤) */}
      <div className="flex-1 pr-1 -mr-1 custom-scrollbar overflow-y-auto space-y-2">
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
const RankingItem = ({ member }: { member: any }) => {
  const isMe = member.me;

  // 내 행 하이라이트 스타일 (League Page와 동일)
  const rowClass = isMe
    ? 'bg-primary/5 border-l-2 border-l-primary border-y-transparent border-r-transparent pl-[calc(0.5rem-2px)] pr-2'
    : 'hover:bg-muted/30 border-transparent px-2';

  return (
    <div
      className={`
                relative flex items-center py-1.5 transition-all border-b last:border-b-0
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
        <div
          className={`w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center border shrink-0 ${isMe ? 'border-primary/30' : 'border-border'}`}
        >
          {member.avatar || member.profileImgThumb ? (
            <Image
              src={member.profileImgThumb || member.avatar || '/avatars/default.png'}
              alt={member.name}
              width={24}
              height={24}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : null}
          {!member.avatar && !member.profileImgThumb && <div className="w-full h-full bg-muted" />}
        </div>

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
