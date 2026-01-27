'use client';

import { Trophy } from 'lucide-react';
import Image from 'next/image';
import LeagueIcon, { LEAGUE_NAMES } from '@/components/LeagueIcon';
import { useLeagueRanking } from '../hooks/useDashboardData';
import { LEAGUE_RULES } from '../mocks/dashboardMocks';

const LeagueRanking = () => {
  const { data } = useLeagueRanking();

  // 현재 리그의 승급/강등 규칙 가져오기
  const rules = LEAGUE_RULES[data.myLeague];
  const totalMembers = data.members.length;

  // 승급 라인 인덱스 (이 등수 아래에 선을 그음) -> 1등부터 N등까지 승급
  const promotionIndex = rules.promote - 1;

  // 강등 라인 인덱스 (이 등수 위에 선을 그음) -> 하위 N명 강등
  // 예: 10명 중 3명 강등 -> 7등(index 6)까지 생존, 8등(index 7)부터 강등
  // 즉 index 6과 7 사이에 선을 그어야 함 -> index 6 아래에 그음
  const demotionIndex = totalMembers - rules.demote - 1;

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

      {/* 순위 목록 헤더 */}
      <div className="flex items-center text-[11px] font-medium text-muted-foreground px-2 pb-1.5 border-b border-border/50 mb-1">
        <span className="w-6 text-center">순위</span>
        <span className="flex-1 ml-2">사용자</span>
        <span>점수</span>
      </div>

      {/* 순위 목록 (스크롤) */}
      <div className="flex-1 pr-1 -mr-1">
        <div className="space-y-0.5 relative">
          {data.members.map((member, index) => (
            <div key={member.rank}>
              <div
                className={`flex items-center py-1.5 px-2 rounded-lg transition-all ${
                  member.isMe
                    ? 'bg-secondary/50 border border-primary/30'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                {/* 순위 & 메달 */}
                <div className="w-6 flex justify-center shrink-0">
                  <span
                    className={`text-xs font-medium ${member.isMe ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                  >
                    {member.rank}
                  </span>
                </div>

                {/* 아바타 & 이름 */}
                <div className="flex-1 flex items-center gap-2 ml-2 overflow-hidden">
                  <div
                    className={`w-6 h-6 rounded-full overflow-hidden shrink-0 border ${member.isMe ? 'border-primary/30' : 'border-border'}`}
                  >
                    {member.avatar ? (
                      <Image
                        src={member.avatar}
                        alt={member.name}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium truncate ${member.isMe ? 'text-primary font-bold' : 'text-foreground'}`}
                  >
                    {member.name}
                    {member.isMe && (
                      <span className="text-primary text-[10px] font-normal ml-1">(나)</span>
                    )}
                  </span>
                </div>

                {/* 점수 */}
                <span
                  className={`text-xs font-bold ml-1 ${member.isMe ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {member.score.toLocaleString()}
                </span>
              </div>

              {/* 승급 구분선 */}
              {rules.promote > 0 && index === promotionIndex && (
                <div className="flex items-center gap-2 my-2">
                  <div className="h-[1px] flex-1 bg-green-200 dark:bg-green-900/50"></div>
                  <span className="text-[10px] text-green-500 font-medium">승급</span>
                  <div className="h-[1px] flex-1 bg-green-200 dark:bg-green-900/50"></div>
                </div>
              )}

              {/* 강등 구분선 */}
              {rules.demote > 0 && index === demotionIndex && (
                <div className="flex items-center gap-2 my-2">
                  <div className="h-[1px] flex-1 bg-red-200 dark:bg-red-900/50"></div>
                  <span className="text-[10px] text-red-500 font-medium">강등</span>
                  <div className="h-[1px] flex-1 bg-red-200 dark:bg-red-900/50"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeagueRanking;
