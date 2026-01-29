'use client';

import React from 'react';
import { Trophy, Crown, Award } from 'lucide-react';
import { CCLeagueProgression } from './CCLeagueProgression';
import { CCPersonalStats } from './CCPersonalStats';
import { useCountUp } from '../../hooks/useCountUp';
import type { GameParticipant, LeagueInfo, PersonalStats } from '../../types/result';

interface CCMyResultSectionProps {
  myResult?: GameParticipant;
  personalStats: PersonalStats;
  leagueInfo: LeagueInfo;
  playTime: number;
  isOpen: boolean;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
}

const getRankDisplay = (rank: number) => {
  if (rank === 1) {
    return {
      icon: (
        <Crown className="w-20 h-20 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]" />
      ),
      label: 'WINNER',
      subLabel: '#1',
      textClass: 'text-yellow-400',
      containerClass: 'animate-pop-spin',
    };
  }
  if (rank === 2) {
    return {
      icon: <Award className="w-16 h-16 text-gray-300 fill-gray-300/20" />,
      label: '2nd',
      subLabel: 'Rank',
      textClass: 'text-gray-300',
      containerClass: 'animate-pop-spin',
    };
  }
  if (rank === 3) {
    return {
      icon: <Award className="w-16 h-16 text-amber-600 fill-amber-600/20" />,
      label: '3rd',
      subLabel: 'Rank',
      textClass: 'text-amber-600',
      containerClass: 'animate-pop-spin',
    };
  }
  return {
    icon: <Trophy className="w-14 h-14 text-muted-foreground/40" />,
    label: `${rank}th`,
    subLabel: 'Rank',
    textClass: 'text-muted-foreground',
    containerClass: '',
  };
};

const getGlowColor = (rank: number) => {
  if (rank === 1) return 'from-yellow-500/10';
  if (rank === 2) return 'from-gray-300/10';
  if (rank === 3) return 'from-amber-600/10';
  return null;
};

export function CCMyResultSection({
  myResult,
  personalStats,
  leagueInfo,
  playTime,
  isOpen,
  mode,
}: CCMyResultSectionProps) {
  const myRank = myResult?.rank || 0;
  const gainedPoints = personalStats.pointsGained;

  // 점수 카운팅 효과
  const animatedPoints = useCountUp(isOpen ? gainedPoints : 0, 2000);

  const rankDisplay = getRankDisplay(myRank);
  const glowColor = getGlowColor(myRank);

  return (
    <div className="w-[40%] p-5 flex flex-col items-center justify-center border-r border-border/40 bg-card/30 relative overflow-hidden">
      {/* 1, 2, 3등일 때 배경 효과 */}
      {glowColor && (
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${glowColor} via-transparent to-transparent animate-pulse`}
        />
      )}

      {/* 1, 3, 2. 순위 정보, 획득 포인트, 리그 정보 */}
      <div className="w-full flex flex-col items-center justify-center gap-5 relative z-10">
        {/* 1. 순위 정보 */}
        <div className={`flex flex-col items-center gap-3 ${rankDisplay.containerClass}`}>
          <div className="transform drop-shadow-2xl relative">{rankDisplay.icon}</div>
          <div className="flex flex-col items-center leading-none">
            <span
              className={`text-6xl font-black tracking-tighter drop-shadow-lg ${rankDisplay.textClass}`}
            >
              {rankDisplay.label}
            </span>
            {myRank === 1 && (
              <span className="text-sm font-bold text-yellow-600/80 tracking-[0.4em] mt-2 animate-pulse">
                VICTORY
              </span>
            )}
          </div>
        </div>

        {/* 2. 획득 포인트 */}
        <div className="flex flex-col items-center">
          <div className="text-[48px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary to-primary/60 drop-shadow-md tabular-nums">
            +{animatedPoints}p
          </div>
        </div>

        {/* 3. 리그 정보  */}
        <div className="w-full transform scale-[0.88] origin-center relative z-10 opacity-90 hover:opacity-100 transition-opacity">
          <CCLeagueProgression leagueInfo={leagueInfo} />
        </div>
      </div>

      {/* 4. 문제 수/시간 */}
      <div className="w-full relative z-10 mt-4">
        <CCPersonalStats stats={personalStats} playTime={playTime} mode={mode} isOpen={isOpen} />
      </div>
    </div>
  );
}
