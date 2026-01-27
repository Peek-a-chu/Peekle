'use client';

import { useState, useEffect } from 'react';
import { Trophy, Settings2, Clock } from 'lucide-react';
import LeagueIcon, { LEAGUE_NAMES } from '@/components/LeagueIcon';
import { useLeagueRanking, useWeeklyScore } from '@/domains/home/hooks/useDashboardData';
import { LEAGUE_RULES, calculateLeagueCutoffs } from '@/domains/home/mocks/dashboardMocks';
import LeagueRuleModal from './LeagueRuleModal';

// UTC 기준 매주 화요일 21:00 (한국시간 수요일 06:00) 계산
const getNextTuesday2100UTC = () => {
    const now = new Date();
    // 0(일)~6(토). 화요일은 2
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    let daysUntilTue = (2 - day + 7) % 7;

    // 화요일인 경우 시간 체크
    if (day === 2) {
        if (hour < 21) {
            // 화요일 21시 전이면 오늘 21시가 타겟
            daysUntilTue = 0;
        } else {
            // 화요일 21시 이후면 다음주 화요일 21시가 타겟
            daysUntilTue = 7;
        }
    } else if (daysUntilTue === 0) {
        // (2 - day + 7) % 7 이 0이 되는 건 day=2, 화요일
        daysUntilTue = 7;
    }

    const target = new Date();
    target.setUTCDate(now.getUTCDate() + daysUntilTue);
    target.setUTCHours(21, 0, 0, 0); // UTC 21:00 설정

    return target;
};

// 타이머 컴포넌트
const LeagueTimer = ({ targetDate }: { targetDate: Date }) => {
    const [mounted, setMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);

        const updateTimer = () => {
            const now = new Date();
            setTimeLeft(targetDate.getTime() - now.getTime());
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!mounted || timeLeft === null) return null;

    const oneDayMs = 24 * 60 * 60 * 1000;

    // 24시간 미만 (긴박함)
    if (timeLeft < oneDayMs && timeLeft > 0) {
        const h = Math.floor(timeLeft / (1000 * 60 * 60));
        const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 animate-pulse tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>{h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')} 남음</span>
            </div>
        );
    }

    // 종료됨
    if (timeLeft <= 0) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                <span>정산 중</span>
            </div>
        );
    }

    // 기본 (날짜 여유 있음)
    const displayDays = Math.ceil(timeLeft / oneDayMs);

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 text-xs font-medium text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{displayDays}일 남음</span>
        </div>
    );
};

const CCLeagueMyStatus = () => {
    const { data: rankingData } = useLeagueRanking();
    const { data: weeklyData } = useWeeklyScore();

    // --- [Dev] 임시 상태 관리 ---
    const [myRank, setMyRank] = useState(rankingData.myRank);
    const [myScore, setMyScore] = useState(weeklyData.totalScore);
    const [showDev, setShowDev] = useState(false);

    // [Dev] 타겟 날짜 강제 설정
    const [forceTargetDate, setForceTargetDate] = useState<string>("");
    // [Dev] 디버그 패널용 초단위 업데이트
    const [debugTick, setDebugTick] = useState(0);

    // 데이터 로드 시 초기화
    useEffect(() => {
        setMyRank(rankingData.myRank);
        setMyScore(weeklyData.totalScore);
    }, [rankingData.myRank, weeklyData.totalScore]);

    // [Dev] 디버그 모드일 때 1초마다 리렌더링 (시간 확인용)
    useEffect(() => {
        if (!showDev) return;
        const timer = setInterval(() => setDebugTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, [showDev]);

    // 타겟 날짜 결정
    const targetDate = forceTargetDate ? new Date(forceTargetDate) : getNextTuesday2100UTC();
    // ---------------------------

    // 계산 로직
    const rules = LEAGUE_RULES[rankingData.myLeague];
    const totalMembers = rankingData.members.length;

    // 인원 기반 승급/강등 컷 계산 ( helper function 사용 )
    const { promoteCount, demoteCount } = calculateLeagueCutoffs(totalMembers, rules);

    // 승급/강등 상태 메시지
    let statusMessage = "";
    let statusDetail = "";

    if (myRank <= promoteCount) {
        statusMessage = "승급 안정권";
        statusDetail = "승급 구간에 속해있습니다!";
    } else if (myRank > totalMembers - demoteCount) {
        statusMessage = "강등 위험";
        // 유지 구간 마지막 등수 = totalMembers - demoteCount
        // 그 점수
        const maintenanceLastRankIndex = totalMembers - demoteCount - 1;
        const maintenanceLastScore = rankingData.members[maintenanceLastRankIndex]?.score || 0;
        const gap = maintenanceLastScore - myScore + 1;
        statusDetail = `유지 구간까지 ${gap}점`;
    } else {
        statusMessage = "리그 유지 중";
        // 승급 구간 마지막 등수 = promoteCount
        const promoLastRankIndex = promoteCount - 1;
        const promoLastScore = rankingData.members[promoLastRankIndex]?.score || 0;
        const gap = promoLastScore - myScore + 1;
        statusDetail = `승급 구간까지 ${gap}점`;
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-yellow-400">
                        리그
                    </h2>
                    <LeagueRuleModal />
                </div>
                {/* Dev Toggle */}
                <button onClick={() => setShowDev(!showDev)} className="text-muted-foreground/30 hover:text-muted-foreground">
                    <Settings2 className="w-4 h-4" />
                </button>
            </div>

            <p className="text-sm text-muted-foreground -mt-4 mb-4">
                매주 점수를 쌓아 상위 리그로 승급하세요
            </p>

            {/* [Dev] 컨트롤 패널 */}
            {showDev && (
                <div className="bg-muted/30 p-3 rounded-lg mb-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-10 font-bold">내 순위</span>
                        <input
                            type="number"
                            className="w-16 p-1 rounded border"
                            value={myRank}
                            onChange={(e) => setMyRank(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-10 font-bold">내 점수</span>
                        <input
                            type="number"
                            className="w-16 p-1 rounded border"
                            value={myScore}
                            onChange={(e) => setMyScore(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-10 font-bold">종료 설정</span>
                        <input
                            type="datetime-local"
                            className="p-1 rounded border"
                            value={forceTargetDate}
                            onChange={(e) => setForceTargetDate(e.target.value)}
                        />
                        <button
                            onClick={() => setForceTargetDate("")}
                            className="ml-2 text-xs underline text-muted-foreground"
                        >
                            초기화
                        </button>
                    </div>

                    {/* [Dev] 시간 디버깅 정보 */}
                    <div className="pt-2 border-t border-border/20 space-y-1 text-[10px] text-muted-foreground font-mono">
                        <div key={debugTick} className="hidden"></div>
                        <div>현재(KST): {new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
                        <div>현재(Local): {new Date().toLocaleString()}</div>
                        <div>현재(UTC): {new Date().toUTCString()}</div>
                        <div>목표(Target KST): {targetDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</div>
                        <div>목표(Target Local): {targetDate.toLocaleString()}</div>
                        <div>목표(Target UTC): {targetDate.toUTCString()}</div>
                        <div>남은시간(ms): {targetDate.getTime() - new Date().getTime()}</div>
                    </div>
                </div>
            )}

            {/* 카드 */}
            <div className="relative bg-card rounded-3xl p-6 border border-border/50 shadow-sm overflow-hidden">
                {/* 배경 효과 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                {/* 상단: 타이머 (우측 상단 이동) */}
                <div className="absolute top-6 right-6">
                    <LeagueTimer targetDate={targetDate} />
                </div>

                {/* 현재 리그 정보 */}
                <div className="flex items-center gap-3 mb-8">
                    <LeagueIcon league={rankingData.myLeague} size={42} />
                    <div className='flex flex-col'>
                        <span className="font-bold text-lg text-foreground leading-none">
                            {LEAGUE_NAMES[rankingData.myLeague]}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 font-medium">
                            {statusMessage}
                        </span>
                    </div>
                </div>

                {/* 정보 그리드 */}
                <div className="space-y-4">
                    {/* 내 순위 & 점수 한 줄로 */}
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-sm text-muted-foreground font-medium block mb-1">내 순위</span>
                            <span className="text-3xl font-black text-foreground">
                                {myRank}
                                <span className="text-sm font-medium text-muted-foreground ml-1">
                                    / {totalMembers}
                                </span>
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground font-medium block mb-1">점수</span>
                            <span className="text-2xl font-bold text-foreground tabular-nums">{myScore}</span>
                        </div>
                    </div>

                    {/* 상세 정보 (게이지 제거, 텍스트 강조) */}
                    <div className="pt-2">
                        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-center">
                            <span className="text-sm font-bold text-primary">{statusDetail}</span>
                        </div>
                    </div>

                    {/* 최대 리그 기록 */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-2">
                        <span className="text-xs text-muted-foreground font-medium text-nowrap mr-4">최대달성</span>
                        <div className="flex items-center gap-2 text-right">
                            <span className="font-bold text-sm text-foreground">
                                {rankingData.maxLeague ? LEAGUE_NAMES[rankingData.maxLeague] : '-'}
                            </span>
                            <span className="text-border">|</span>
                            <span className="font-bold text-sm text-foreground">
                                {rankingData.maxScore ? `${rankingData.maxScore}점` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CCLeagueMyStatus;
