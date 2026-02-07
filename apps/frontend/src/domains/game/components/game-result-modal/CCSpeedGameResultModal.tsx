'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CCSpeedParticipantRanking } from './CCSpeedParticipantRanking';
import { CCMyResultSection } from './CCMyResultSection';
import { useResultConfetti } from '../../hooks/useResultConfetti';
import type { GameResultData } from '../../types/result';

interface CCSpeedGameResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: GameResultData;
}

export function CCSpeedGameResultModal({ isOpen, onClose, data }: CCSpeedGameResultModalProps) {
    const router = useRouter();
    const { participants, personalStats, leagueInfo, mode, teamType, playTime } = data;

    const modeLabel = '스피드 레이스';
    const teamLabel = '개인전';

    const myResult = participants.find((p) => p.isMe);
    const myRank = myResult?.rank || 0;

    const isWin = myRank === 1;
    const isDraw = false;

    // 폭죽 연출 (Custom Hook 사용)
    useResultConfetti({ isOpen, teamType, isWin, isDraw });

    const handleExit = () => {
        router.push('/game');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[1200px] bg-background/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden gap-0 shadow-2xl [&>button]:hidden">
                {/* 배경 장식 */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                {/* 배경 강조 효과 (승리 시) */}
                {isWin && (
                    <div className="absolute top-0 left-0 w-[40%] h-full bg-yellow-500/5 blur-3xl pointer-events-none animate-pulse" />
                )}

                {/* 헤더 */}
                <DialogHeader className="px-8 py-5 border-b border-border/40 flex flex-row items-center justify-start gap-4 relative z-10 bg-muted/10">
                    <DialogTitle className="text-2xl font-black text-primary flex items-baseline gap-2 shrink-0">
                        GAME RESULT
                    </DialogTitle>
                    <div className="flex items-center gap-3">
                        <span className="px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-black tracking-wider uppercase">
                            {teamLabel}
                        </span>
                        <span className="px-5 py-2 rounded-full bg-muted text-muted-foreground text-sm font-black tracking-wider uppercase">
                            {modeLabel}
                        </span>
                    </div>
                </DialogHeader>

                {/* 메인 컨텐츠 영역 (가로 배치) */}
                <div className="flex h-[600px] relative z-10">
                    {/* 왼쪽: 내 성과 (점수 숨김) */}
                    <CCMyResultSection
                        myResult={myResult}
                        personalStats={personalStats}
                        leagueInfo={leagueInfo}
                        playTime={playTime}
                        isOpen={isOpen}
                        mode={mode}
                        showScore={false}
                    />

                    {/* 오른쪽: 전체 순위 (Speed 전용) */}
                    <div className="w-[60%] p-6 flex flex-col bg-muted/5">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full" />
                                참여자 순위
                            </h4>
                        </div>

                        <div className="flex-1 min-h-0">
                            <CCSpeedParticipantRanking participants={participants} />
                        </div>

                        <div className="mt-4 pt-2 flex justify-end">
                            <Button
                                onClick={handleExit}
                                size="lg"
                                className="px-8 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-[0.98]"
                            >
                                나가기
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
