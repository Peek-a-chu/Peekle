'use client';

import React from 'react';
import Image from 'next/image';
import { Crown, Sparkles } from 'lucide-react';
import type { GameParticipant } from '../../types/result';

interface CCTeamCardProps {
  team: GameParticipant[];
  teamColor: 'RED' | 'BLUE';
  isWinner: boolean;
  mvpId?: number;
  score: number;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
}

export function CCTeamCard({ team, teamColor, isWinner, mvpId, score, mode }: CCTeamCardProps) {
  const theme =
    teamColor === 'RED'
      ? {
        bg: 'bg-red-500/5',
        border: 'border-red-500/20',
        text: 'text-red-500',
        glow: 'shadow-red-500/20',
      }
      : {
        bg: 'bg-blue-500/5',
        border: 'border-blue-500/20',
        text: 'text-blue-500',
        glow: 'shadow-blue-500/20',
      };

  const formatTime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'FAILED';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex-1 flex flex-col gap-3 p-4 rounded-2xl border ${theme.border} ${theme.bg} relative ${isWinner ? 'z-10 shadow-2xl animate-slam-effect ' + theme.glow : 'transition-all duration-500 scale-95 opacity-80 grayscale-[0.3]'}`}
    >
      {/* Winner Stamp */}
      {isWinner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="transform -rotate-[30deg]">
            <div
              className={`w-48 h-48 rounded-full border-[8px] border-double ${teamColor === 'RED' ? 'border-red-500 text-red-500 bg-red-500/5' : 'border-blue-500 text-blue-500 bg-blue-500/5'} flex items-center justify-center shadow-2xl backdrop-blur-[2px] animate-glitch-snap`}
              style={{ animationDelay: '1s', animationFillMode: 'both' }}
            >
              <div className="text-center">
                <span className="text-4xl font-black tracking-widest uppercase drop-shadow-sm block">
                  WINNER
                </span>
                <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-70 block mt-1">
                  VICTORY
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${theme.border} mb-2`}>
        <h3 className={`text-2xl font-black italic tracking-tighter uppercase ${theme.text}`}>
          {teamColor} TEAM
        </h3>
        {mode !== 'SPEED_RACE' && (
          <div className="text-right">
            <span className="text-xs font-bold text-muted-foreground block uppercase">
              Total Solved
            </span>
            <span className={`text-3xl font-black ${theme.text} leading-none`}>{score}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {team.map((p) => {
          const isFailed = mode === 'SPEED_RACE' && (p.clearTime === undefined || p.clearTime === null);
          return (
            <div
              key={p.userId}
              className={`group relative flex items-center p-3 rounded-xl border transition-all ${p.isMe
                ? `bg-background ${p.teamId === 'RED' ? 'border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`
                : 'bg-background/50 border-border/50 hover:bg-background'
                } ${p.userId === mvpId ? 'z-20' : 'z-0'}`}
            >
              {/* MVP/ACE Badge */}
              {p.userId === mvpId && (
                <div className="absolute -top-3 -left-3 z-30">
                  {isWinner ? (
                    <div className="bg-yellow-400 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-sm shadow-lg flex items-center gap-1 transform -rotate-12 border border-yellow-200">
                      <Crown size={12} strokeWidth={3} /> MVP
                    </div>
                  ) : (
                    <div className="bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-sm shadow-lg flex items-center gap-1 transform -rotate-12 border border-purple-400">
                      <Sparkles size={12} strokeWidth={3} /> ACE
                    </div>
                  )}
                </div>
              )}

              {/* Rank Info (Team Internal Rank) */}
              <div className="w-8 flex justify-center shrink-0 font-bold text-muted-foreground/70">
                {team.indexOf(p) + 1}
              </div>

              {/* Profile & Name */}
              <div className="flex-1 flex items-center gap-3 overflow-hidden">
                {/* Profile Image Removed */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-sm font-bold truncate ${p.isMe ? theme.text : 'text-foreground'}`}
                  >
                    {p.nickname}
                    {p.isMe && <span className="ml-1 text-[10px] opacity-70">(Me)</span>}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className={`w-16 text-right font-medium tabular-nums ${isFailed ? 'text-red-500 font-bold text-xs' : 'text-muted-foreground/80'}`}>
                  {mode === 'SPEED_RACE' ? formatTime(p.clearTime) : `${p.solvedCount || 0} Solved`}
                </div>
                {mode !== 'SPEED_RACE' && (
                  <div className={`w-16 text-right font-black tabular-nums ${theme.text}`}>
                    {p.score.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
