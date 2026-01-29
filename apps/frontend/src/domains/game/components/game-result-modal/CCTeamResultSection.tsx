'use client';

import React, { useMemo } from 'react';
import { Trophy, Swords } from 'lucide-react';
import { CCTeamCard } from './CCTeamCard';
import { calculateTeamScores, determineWinningTeam, getTeamMembers } from '@/lib/gameResultUtils';
import type { GameParticipant } from '../../types/result';

interface CCTeamResultSectionProps {
  participants: GameParticipant[];
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
}

export function CCTeamResultSection({ participants, mode }: CCTeamResultSectionProps) {
  // 팀별 참가자 분류 및 점수 계산
  const { redTeam, blueTeam, redScore, blueScore, winningTeam, redMvp, blueMvp } = useMemo(() => {
    const { redTeam, blueTeam } = getTeamMembers(participants);
    const { redScore, blueScore } = calculateTeamScores(participants);
    const win = determineWinningTeam(redScore, blueScore);

    return {
      redTeam,
      blueTeam,
      redScore,
      blueScore,
      winningTeam: win,
      redMvp: redTeam[0],
      blueMvp: blueTeam[0],
    };
  }, [participants]);

  return (
    <div className="w-full h-full flex items-stretch gap-8 p-2">
      {/* RED TEAM (LEFT) */}
      <CCTeamCard
        team={redTeam}
        teamColor="RED"
        isWinner={winningTeam === 'RED'}
        mvpId={redMvp?.userId}
        score={redScore}
        mode={mode}
      />

      {/* CENTER BANNER */}
      <div className="w-48 flex flex-col items-center justify-center shrink-0 relative z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-transparent pointer-events-none" />

        <div className="relative animate-bounce-slow">
          {winningTeam !== 'DRAW' ? (
            <>
              <Trophy
                size={70}
                className={`drop-shadow-2xl ${winningTeam === 'RED' ? 'text-red-500 fill-red-500/20' : 'text-blue-500 fill-blue-500/20'}`}
              />
              <div
                className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-black px-2 py-0.5 rounded-full border bg-background ${winningTeam === 'RED' ? 'text-red-500 border-red-500' : 'text-blue-500 border-blue-500'}`}
              >
                WINNER
              </div>
            </>
          ) : (
            <Swords size={60} className="text-gray-400" />
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
            Victory
          </span>
          <h2
            className={`text-3xl font-black italic tracking-tighter uppercase ${
              winningTeam === 'RED'
                ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : winningTeam === 'BLUE'
                  ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'text-gray-400'
            }`}
          >
            {winningTeam}
          </h2>
        </div>

        {/* Score Board */}
        <div className="mt-5 mb-2 flex items-center justify-center gap-4 bg-muted/20 px-4 py-2 rounded-2xl border border-border/40 backdrop-blur-sm">
          <span className="text-3xl font-black text-red-500 drop-shadow-sm">{redScore}</span>
          <span className="text-xl font-black text-muted-foreground/30">:</span>
          <span className="text-3xl font-black text-blue-500 drop-shadow-sm">{blueScore}</span>
        </div>

        {/* VS Badge */}
        <div className="mt-2 relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <span className="relative z-10 text-lg font-black text-muted-foreground/50 italic">
            VS
          </span>
        </div>
      </div>

      {/* BLUE TEAM (RIGHT) */}
      <CCTeamCard
        team={blueTeam}
        teamColor="BLUE"
        isWinner={winningTeam === 'BLUE'}
        mvpId={blueMvp?.userId}
        score={blueScore}
        mode={mode}
      />
    </div>
  );
}
