'use client';

import React from 'react';
import type { GameParticipant } from '../../types/result';

interface CCSpeedParticipantRankingProps {
    participants: GameParticipant[];
}

export function CCSpeedParticipantRanking({ participants }: CCSpeedParticipantRankingProps) {
    // 순위대로 정렬 (rank 기준) -> 이미 정렬되어 오는지 확인 필요하지만 안전하게 정렬
    const sortedParticipants = [...participants].sort((a, b) => a.rank - b.rank);

    const getRankIcon = (rank: number) => {
        let colorClass = 'text-muted-foreground';
        if (rank === 1) colorClass = 'text-yellow-500';
        else if (rank === 2) colorClass = 'text-gray-400';
        else if (rank === 3) colorClass = 'text-amber-600';

        return <span className={`text-base font-bold ${colorClass} w-6 text-center`}>{rank}</span>;
    };

    const formatTime = (seconds?: number) => {
        if (seconds === undefined || seconds === null) return 'FAILED';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center text-xs font-bold text-muted-foreground px-4 mb-2 uppercase tracking-wider opacity-70">
                <span className="w-10 text-center">Rank</span>
                <span className="flex-1 ml-4">User</span>
                <span className="w-32 text-center text-primary/80">Time</span>
                {/* Score 컬럼 제거, Time 컬럼 강조 */}
            </div>

            <div className="flex-1 overflow-y-auto px-1 pt-3 pb-2 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {sortedParticipants.map((p) => {
                    let borderColor = 'border-gray-500';
                    let glowColor = 'bg-gray-500';
                    const isFailed = p.clearTime === undefined || p.clearTime === null;

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
                                    <span
                                        className={`flex items-center text-lg font-bold truncate ${p.isMe ? 'text-yellow-400' : 'text-foreground'
                                            }`}
                                    >
                                        {p.nickname}
                                        {p.isMe && <span className="ml-1.5 text-xs opacity-70">(나)</span>}
                                    </span>
                                </div>

                                <div
                                    className={`w-32 text-center font-bold text-xl flex items-center justify-center ${isFailed
                                        ? 'text-red-500 text-base'
                                        : (p.isMe ? 'text-yellow-400' : 'text-primary')
                                        }`}
                                >
                                    {formatTime(p.clearTime)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
