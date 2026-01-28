'use client';

import { useState, useEffect } from 'react';
import {
    HelpCircle,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Brain,
    Gamepad2,
    Users,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Import Tabs
import LeagueIcon, { LEAGUE_NAMES, LEAGUE_ORDER, LeagueType } from '@/components/LeagueIcon';
import { useLeagueRules } from '@/domains/home/hooks/useDashboardData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LeagueRuleModalProps {
    myLeague?: LeagueType;
    myPercentile?: number;
    leagueStats?: { tier?: string; percentile?: number }[];
}

const LeagueRuleModal = ({
    myLeague = 'gold',
    myPercentile,
    leagueStats,
}: LeagueRuleModalProps) => {
    const [selectedLeague, setSelectedLeague] = useState<LeagueType>(myLeague);
    const { data: rules } = useLeagueRules();

    // myLeague 데이터 로드 시 선택 리그 동기화
    useEffect(() => {
        if (myLeague) setSelectedLeague(myLeague);
    }, [myLeague]);

    // 리그별 누적 상위 백분위 (Standard Cumulative Distribution)
    const CUMULATIVE_PERCENTILES: Record<LeagueType, number> = {
        ruby: 3,
        emerald: 5,
        diamond: 10,
        platinum: 20,
        gold: 40,
        silver: 70,
        bronze: 90,
        stone: 100,
    };

    const displayPercentile = CUMULATIVE_PERCENTILES[selectedLeague];

    const rule = rules?.[selectedLeague] || { promotePercent: 0, demotePercent: 0 };
    const promotePercent = rule.promotePercent;
    const demotePercent = rule.demotePercent;

    // 점수 획득 방법 데이터 (아이콘, 라벨, 값) - 통합된 테마 컬러 적용
    const SCORE_RULES = [
        {
            icon: Brain,
            label: '문제 풀이',
            value: '+10 ~ 50점',
            desc: '난이도(티어)에 따라 차등 지급됩니다.',
            // Theme Primary
            style: 'bg-primary/5 border-primary/20 hover:bg-primary/10',
            iconStyle: 'text-primary bg-primary/10 border-primary/20',
            textStyle: 'text-foreground font-bold',
            badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        },
        {
            icon: Gamepad2,
            label: '게임 승리',
            value: '참여 인원 비례',
            desc: '1등: N*10점, 이후 순위별 -10점씩 차감 (예: 3명 참여시 1등 30점, 2등 20점)',
            // Theme Primary
            style: 'bg-primary/5 border-primary/20 hover:bg-primary/10',
            iconStyle: 'text-primary bg-primary/10 border-primary/20',
            textStyle: 'text-foreground font-bold',
            badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        },
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 rounded-full hover:bg-muted/50">
                    <HelpCircle className="w-4 h-4" />
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
                <div className="flex h-[500px]">
                    {' '}
                    {/* 높이 줄임 */}
                    {/* [좌측] 리그 목록 */}
                    <div className="w-56 border-r border-border bg-muted/10 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                        <div className="text-xs font-bold text-muted-foreground mb-3 px-2">리그 선택</div>
                        {LEAGUE_ORDER.map((league) => (
                            <button
                                key={league}
                                onClick={() => setSelectedLeague(league)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                    selectedLeague === league
                                        ? 'bg-primary/10 text-foreground shadow-sm ring-1 ring-border'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                )}
                            >
                                <LeagueIcon league={league} size={18} />
                                <span>{LEAGUE_NAMES[league]}</span>
                            </button>
                        ))}
                    </div>
                    {/* [우측] 상세 내용 */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* 헤더 (Compact) */}
                        <div className="flex items-center justify-between p-6 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <LeagueIcon league={selectedLeague} size={36} />
                                <div>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                                        <span>{LEAGUE_NAMES[selectedLeague]}</span>
                                        {displayPercentile !== undefined && (
                                            <Badge
                                                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-[10px] px-1.5 py-0 h-5 font-normal shadow-none"
                                            >
                                                상위 {displayPercentile}%
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                </div>
                            </div>
                        </div>

                        {/* 탭 컨텐츠 */}
                        <Tabs defaultValue="grade" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="grade">승급/강등 규칙</TabsTrigger>
                                    <TabsTrigger value="score">점수 획득 방법</TabsTrigger>
                                </TabsList>
                            </div>

                            {/* 1. 승급/강등 탭 */}
                            <TabsContent
                                value="grade"
                                className="flex-1 p-6 pt-4 overflow-y-auto space-y-3 custom-scrollbar"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-muted-foreground">구간 정보</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
                                        * 인원은 올림(Ceiling) 처리
                                    </span>
                                </div>

                                {/* 승급 */}
                                {promotePercent > 0 ? (
                                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
                                        <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-500 mt-0.5">
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                                                승급 구간
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                상위 <span className="font-bold text-foreground">{promotePercent}%</span>
                                                {LEAGUE_ORDER.indexOf(selectedLeague) < LEAGUE_ORDER.length - 1 && (
                                                    <>
                                                        {' '}
                                                        → {LEAGUE_NAMES[LEAGUE_ORDER[LEAGUE_ORDER.indexOf(selectedLeague) + 1]]}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl border border-zinc-500/20 bg-zinc-500/5 text-center text-xs text-muted-foreground">
                                        승급이 없는 최고 등급입니다.
                                    </div>
                                )}

                                {/* 유지 */}
                                <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-start gap-3">
                                    <div className="p-1.5 rounded-full bg-zinc-500/20 text-zinc-500 mt-0.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-muted-foreground mb-0.5">유지 구간</div>
                                        <div className="text-xs text-muted-foreground">
                                            상위 {promotePercent}% 제외, 하위 {demotePercent}% 제외
                                        </div>
                                    </div>
                                </div>

                                {/* 강등 */}
                                {demotePercent > 0 ? (
                                    <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                                        <div className="p-1.5 rounded-full bg-red-500/20 text-red-500 mt-0.5">
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-0.5">
                                                강등 구간
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                하위 <span className="font-bold text-foreground">{demotePercent}%</span>
                                                {LEAGUE_ORDER.indexOf(selectedLeague) > 0 && (
                                                    <>
                                                        {' '}
                                                        → {LEAGUE_NAMES[LEAGUE_ORDER[LEAGUE_ORDER.indexOf(selectedLeague) - 1]]}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl border border-zinc-500/20 bg-zinc-500/5 text-center text-xs text-muted-foreground">
                                        강등이 없는 시작 등급입니다.
                                    </div>
                                )}
                            </TabsContent>

                            {/* 2. 점수 획득 탭 (Compact List) */}
                            <TabsContent
                                value="score"
                                className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar"
                            >
                                <div className="space-y-2">
                                    {SCORE_RULES.map((rule, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border transition-colors ${rule.style}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-md border shadow-sm ${rule.iconStyle}`}>
                                                        <rule.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className={`text-sm font-bold ${rule.textStyle}`}>
                                                        {rule.label}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className={`font-mono ${rule.badgeStyle}`}>
                                                    {rule.value}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground pl-10 leading-snug">
                                                {rule.desc}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {/* 팀전 규칙 카드 - Unified Theme */}
                                <div className="group p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-md bg-background border border-primary/20 shadow-sm">
                                                <Users className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="text-sm font-bold text-foreground">
                                                팀전 점수 분배
                                            </span>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono bg-primary/10 border-primary/20 text-primary"
                                        >
                                            균등 분배
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground pl-10 leading-snug">
                                        승리 팀이 상위 순위(1~N/2등) 점수 합계를 가져가며 팀원들에게{' '}
                                        <strong>균등 분배</strong>됩니다. <br className="hidden sm:block" />
                                        (예: 2vs2 승리 시 1,2등 점수 합계 ÷ 2)
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LeagueRuleModal;
