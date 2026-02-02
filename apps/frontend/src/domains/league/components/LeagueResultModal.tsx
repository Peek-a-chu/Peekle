'use client';

import { useEffect, useState } from 'react';
import {
    getUnviewedLeagueHistory,
    markLeagueHistoryAsViewed,
    getLeagueHistoryRanking,
    LeagueHistoryResponse,
    BackendRankingMember
} from '@/app/api/leagueApi';
import LeagueIcon, { LeagueType, LEAGUE_ORDER, LEAGUE_NAMES } from '@/components/LeagueIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon } from '@/components/UserIcon';
import Image from 'next/image';

type ModalStep = 'RANKING' | 'RESULT';

export default function LeagueResultModal() {
    const [history, setHistory] = useState<LeagueHistoryResponse | null>(null);
    const [ranking, setRanking] = useState<BackendRankingMember[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ModalStep>('RANKING');
    const [isLoadingRanking, setIsLoadingRanking] = useState(false);

    useEffect(() => {
        async function checkHistory() {
            try {
                const data = await getUnviewedLeagueHistory();
                if (data) {
                    setHistory(data);
                    setIsOpen(true);

                    // Fetch ranking immediately if data exists
                    setIsLoadingRanking(true);
                    const rankList = await getLeagueHistoryRanking(data.id);
                    setRanking(rankList);
                    setIsLoadingRanking(false);
                }
            } catch (e) {
                console.error(e);
            }
        }
        checkHistory();
    }, []);

    const handleContinue = async () => {
        if (step === 'RANKING') {
            setStep('RESULT');
        } else {
            if (history) {
                await markLeagueHistoryAsViewed(history.id);
                setIsOpen(false);
                setHistory(null);
                setStep('RANKING'); // Reset for next time
            }
        }
    };

    if (!isOpen || !history) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                className="bg-[#131F24] rounded-2xl w-full border border-white/5 text-center shadow-2xl overflow-hidden flex flex-col max-h-[80vh] max-w-sm animate-in fade-in zoom-in duration-300"
            >
                {step === 'RANKING' ? (
                    <RankingView
                        history={history}
                        ranking={ranking}
                        loading={isLoadingRanking}
                        onContinue={handleContinue}
                    />
                ) : (
                    <ResultView
                        history={history}
                        onContinue={handleContinue}
                    />
                )}
            </div>
        </div>
    );
}

// Sub-component: Ranking View

// Sub-component: Ranking View
function RankingView({
    history,
    ranking,
    loading,
    onContinue
}: {
    history: LeagueHistoryResponse;
    ranking: BackendRankingMember[];
    loading: boolean;
    onContinue: () => void;
}) {
    // Group members by status
    const promotionZone = ranking.filter((m) => m.status === 'PROMOTE');
    const maintenanceZone = ranking.filter((m) => m.status === 'STAY');
    const demotionZone = ranking.filter((m) => m.status === 'DEMOTE');

    return (
        <>
            <div className="bg-card p-6 pb-2">
                <div className="flex justify-center mb-4">
                    <LeagueIcon league={history.league.toLowerCase() as LeagueType} size={64} className="drop-shadow-lg" />
                </div>
                <h2 className="text-xl font-bold text-card-foreground mb-2">
                    지난 주에 <span className="text-primary">{history.rank}위</span>로 완료했습니다
                </h2>
                {/* Result text removed as requested */}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 custom-scrollbar bg-card">
                {loading ? (
                    <div className="text-muted-foreground py-10">랭킹 불러오는 중...</div>
                ) : ranking.length > 0 ? (
                    <>
                        {/* 1. 승급 구간 */}
                        {promotionZone.length > 0 && (
                            <div className="space-y-2">
                                <div className="rounded-xl border border-success/20 bg-success/5 overflow-hidden">
                                    {promotionZone.map((member) => (
                                        <RankingItem key={member.name} member={member} />
                                    ))}
                                </div>
                                {/* Separator */}
                                {(maintenanceZone.length > 0 || demotionZone.length > 0) && (
                                    <div className="flex items-center gap-2 px-1 py-1">
                                        <div className="h-[1px] flex-1 bg-success/30"></div>
                                        <span className="text-[10px] text-success font-bold uppercase tracking-wider">승급 구간</span>
                                        <div className="h-[1px] flex-1 bg-success/30"></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. 유지 구간 */}
                        {maintenanceZone.length > 0 && (
                            <div className="space-y-2">
                                <div className="rounded-xl border border-transparent">
                                    {maintenanceZone.map((member) => (
                                        <RankingItem key={member.name} member={member} />
                                    ))}
                                </div>
                                {/* Separator if demotion exists */}
                                {demotionZone.length > 0 && (
                                    <div className="flex items-center gap-2 px-1 py-1">
                                        <div className="h-[1px] flex-1 bg-destructive/30"></div>
                                        <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">강등 구간</span>
                                        <div className="h-[1px] flex-1 bg-destructive/30"></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. 강등 구간 */}
                        {demotionZone.length > 0 && (
                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                                {demotionZone.map((member) => (
                                    <RankingItem key={member.name} member={member} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-muted-foreground py-10 text-sm">랭킹 정보가 없습니다.</div>
                )}
            </div>

            <div className="p-4 bg-card border-t border-border">
                <button
                    onClick={onContinue}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg active:translate-y-[2px] transition-all uppercase tracking-wide"
                >
                    계속하기
                </button>
            </div>
        </>
    );
}

// Sub-component: Ranking Item
function RankingItem({ member }: { member: BackendRankingMember }) {
    const isMe = member.me;

    return (
        <div
            className={`
        flex items-center p-3 rounded-xl border-2 transition-colors
        ${isMe
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-transparent border-transparent hover:bg-muted/50'
                }
      `}
        >
            <div className={`w-8 font-bold text-center ${isMe ? 'text-primary' : 'text-muted-foreground'}`}>
                {member.rank}
            </div>

            <div className="mx-3 relative">
                <UserIcon
                    src={member.profileImgThumb}
                    nickname={member.name}
                    size={40}
                />
                {isMe && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>}
            </div>

            <div className="flex-1 text-left min-w-0">
                <div className={`font-bold truncate ${isMe ? 'text-primary' : 'text-card-foreground'}`}>
                    {member.name}
                </div>
                <div className="text-xs text-muted-foreground">
                    {member.score.toLocaleString()} XP
                </div>
            </div>
        </div>
    );
}


// Sub-component: Result View (Existing Logic)
function ResultView({ history, onContinue }: { history: LeagueHistoryResponse; onContinue: () => void }) {
    const isPromoted = history.result === 'PROMOTED';
    const isDemoted = history.result === 'DEMOTED';
    // const isMaintained = history.result === 'STAY' || history.result === 'MAINTAINED';

    // Calculate target league based on result
    // Use history.currentLeague which comes from backend (actual current status)
    const targetLeague = history.currentLeague?.toLowerCase() as LeagueType || history.league.toLowerCase() as LeagueType;

    // Get Korean name
    const targetLeagueKorName = LEAGUE_NAMES[targetLeague] || targetLeague;

    const title = isPromoted
        ? '축하합니다! 다음 주는'
        : isDemoted
            ? '아쉽게도 다음 주는'
            : '다음 주도';

    const subTitle = isPromoted
        ? `${targetLeagueKorName} 리그에서 시작합니다.`
        : isDemoted
            ? `${targetLeagueKorName} 리그에서 시작합니다.`
            : `${targetLeagueKorName} 리그에서 시작합니다.`;

    return (
        <div className="flex flex-col h-full bg-card p-6">
            <div className="flex-1 flex flex-col items-center justify-center">
                {/* Animations or particles could go here */}
                <div className="mb-8 relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                    <LeagueIcon league={targetLeague} size={140} className="relative z-10 drop-shadow-2xl" />
                </div>

                <h2 className="text-xl font-bold text-muted-foreground mb-1">
                    {title}
                </h2>
                <h1 className="text-2xl font-extrabold text-card-foreground mb-6">
                    {subTitle}
                </h1>
            </div>

            <div className="w-full">
                <button
                    onClick={onContinue}
                    className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg active:translate-y-[2px] transition-all uppercase tracking-wide"
                >
                    계속하기
                </button>
            </div>
        </div>
    );
}
