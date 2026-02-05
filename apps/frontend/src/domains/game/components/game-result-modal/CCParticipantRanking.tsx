'use client';

import React from 'react';
import Image from 'next/image';
import { Trophy, Medal } from 'lucide-react';
import type { GameParticipant } from '../../types/result';

interface CCParticipantRankingProps {
  participants: GameParticipant[];
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  teamType?: 'INDIVIDUAL' | 'TEAM';
}

export function CCParticipantRanking({ participants, mode, teamType }: CCParticipantRankingProps) {
  // 순위대로 정렬 (rank 기준)
  const sortedParticipants = [...participants].sort((a, b) => a.rank - b.rank);

  const getRankIcon = (rank: number) => {
    let colorClass = 'text-muted-foreground';
    if (rank === 1) colorClass = 'text-yellow-500';
    else if (rank === 2) colorClass = 'text-gray-400';
    else if (rank === 3) colorClass = 'text-amber-600';

    return <span className={`text-base font-bold ${colorClass} w-6 text-center`}>{rank}</span>;
  };

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center text-xs font-bold text-muted-foreground px-4 mb-2 uppercase tracking-wider opacity-70">
        <span className="w-10 text-center">Rank</span>
        <span className="flex-1 ml-4">User</span>
        <span className="w-20 text-center mr-2">{mode === 'SPEED_RACE' ? 'Time' : 'Solved'}</span>
        <span className="w-24 text-right">Score</span>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pt-3 pb-2 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sortedParticipants.map((p) => {
          // 내 카드일 때 순위별 테두리 및 Glow 색상 결정
          let borderColor = 'border-gray-500';
          let glowColor = 'bg-gray-500';

          if (p.rank === 1) {
            borderColor = 'border-yellow-400';
            glowColor = 'bg-yellow-400';
          } else if (p.rank === 2) {
            borderColor = 'border-gray-300';
            glowColor = 'bg-gray-300';
          } else if (p.rank === 3) {
            borderColor = 'border-amber-600';
            glowColor = 'bg-amber-600';
          }

          return (
            <div
              key={p.userId}
              className={`relative transition-all duration-300 ${p.isMe ? 'animate-float z-10' : ''}`}
            >
              {/* 사용자 지정 Glow 효과 (순위별 색상 적용) */}
              {p.isMe && (
                <div
                  className={`absolute -inset-[1px] rounded-xl blur-[2px] opacity-70 animate-pulse ${glowColor}`}
                />
              )}

              <div
                className={`relative flex items-center py-4 px-5 rounded-xl border ${p.isMe ? `bg-card ${borderColor}` : 'bg-card border-border/40 hover:bg-accent/5'
                  }`}
              >
                <div className="w-10 flex justify-center shrink-0">{getRankIcon(p.rank)}</div>

                <div className="flex-1 flex items-center gap-4 ml-4 overflow-hidden">
                  {/* Profile Image removed as requested */}
                  <span
                    className={`flex items-center text-lg font-bold truncate ${p.isMe ? 'text-yellow-400' : 'text-foreground'}`}
                  >
                    {/* Team Badge */}
                    {teamType === 'TEAM' && p.teamId && (
                      <span
                        className={`mr-2 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${p.teamId === 'RED'
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}
                      >
                        {p.teamId}
                      </span>
                    )}
                    {p.nickname}
                    {p.isMe && <span className="ml-1.5 text-xs opacity-70">(나)</span>}
                  </span>
                </div>

                <div
                  className={`w-20 text-center font-bold text-base mr-2 flex items-center justify-center ${p.isMe ? 'text-yellow-400/80' : 'text-muted-foreground'}`}
                >
                  {mode === 'SPEED_RACE' ? (
                    formatTime(p.clearTime)
                  ) : (
                    <span>{p.solvedCount ?? 0}</span>
                  )}
                </div>

                <div className="w-24 text-right shrink-0">
                  <span
                    className={`text-lg font-black tracking-tight ${p.isMe ? 'text-yellow-400' : 'text-muted-foreground'}`}
                  >
                    {p.score.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
