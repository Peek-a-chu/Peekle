'use client';

import React from 'react';
import LeagueIcon, { LEAGUE_NAMES, LEAGUE_COLORS } from '@/components/LeagueIcon';
import type { LeagueInfo } from '../../types/result';

interface CCLeagueProgressionProps {
  leagueInfo: LeagueInfo;
}

export function CCLeagueProgression({ leagueInfo }: CCLeagueProgressionProps) {
  const { league } = leagueInfo;
  const leagueColor = LEAGUE_COLORS[league];

  return (
    <div className="flex flex-col items-center justify-center px-4 pb-0 pt-1">
      <div className="relative mb-4 group saturate-200 animate-twinkle">
        {/* 아이콘 뒤 광채 효과 */}
        <div
          className="absolute inset-0 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-full"
          style={{ backgroundColor: leagueColor }}
        />
        <LeagueIcon
          league={league}
          size={100}
          className="relative z-10 drop-shadow-2xl transform transition-transform group-hover:scale-110 duration-300"
        />
      </div>

      <div className="text-center">
        <h3
          className="text-2xl font-black text-foreground tracking-tight uppercase"
          style={{ color: leagueColor }}
        >
          {LEAGUE_NAMES[league]}
        </h3>
        <p className="text-xs font-medium text-muted-foreground mt-1">CURRENT LEAGUE</p>
      </div>
    </div>
  );
}
