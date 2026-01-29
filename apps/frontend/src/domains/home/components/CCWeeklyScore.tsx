'use client';

import { useState } from 'react';
import {
    Trophy,
    Users,
    Gamepad2,
    BookOpen,
    Award,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Code2,
    GraduationCap
} from 'lucide-react';
import { useWeeklyScore } from '../hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const CCWeeklyScore = () => {
    // 현재 날짜 (YYYY-MM-DD)
    const [currentDate, setCurrentDate] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const { data, isLoading } = useWeeklyScore(currentDate);

    // 날짜 이동 핸들러
    const handlePrevWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    };

    const handleNextWeek = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    };

    // Date Picker 핸들러
    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setCurrentDate(e.target.value);
        }
    };

    // 다음 주가 미래인지 체크
    const isNextWeekFuture = () => {
        // 현재 날짜에서 7일 뒤 계산
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        const nextWeekStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // 오늘 날짜 구하기
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        return nextWeekStr > todayStr;
    };

    // 날짜 포맷팅 (YYYY-MM-DD -> M월 D일)
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return `${d.getMonth() + 1}월 ${d.getDate()}일`;
        } catch {
            return '';
        }
    };

    // 상세 시간 포맷팅 (relative time)
    const getRelativeTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
        } catch {
            return dateStr;
        }
    };

    // 활동 아이콘 매핑
    const getIcon = (category?: string, description: string = '') => {
        // 백엔드 Enum: PROBLEM, GAME (추후 확장 가능)
        if (category === 'GAME' || description.includes('Game') || description.includes('게임')) return <Gamepad2 className="w-5 h-5 text-purple-500" />;
        if (category === 'PROBLEM' || description.includes('Solved') || description.includes('problem')) return <Code2 className="w-5 h-5 text-green-500" />;
        if (category === 'STUDY' || description.includes('Study') || description.includes('스터디')) return <Users className="w-5 h-5 text-blue-500" />;
        if (category === 'LEAGUE' || description.includes('League') || description.includes('리그')) return <Award className="w-5 h-5 text-yellow-500" />;
        return <Trophy className="w-5 h-5 text-muted-foreground" />;
    };

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 h-full flex items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const dateRangeStr = `${formatDate(data.startDate)} ~ ${formatDate(data.endDate)}`;

    return (
        <div className="bg-card border border-border rounded-2xl p-6 h-full transition-all duration-300 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <div>
                        <h3 className="font-bold text-foreground">기간 별 점수 기록</h3>
                        <p className="text-xs text-muted-foreground">획득한 점수를 확인해보세요</p>
                    </div>
                </div>
                <div className="w-6 h-6" />
            </div>

            {/* 기간 표시 & 내비게이션 */}
            <div className="mb-4 flex items-center justify-center gap-2 flex-shrink-0">
                <button
                    onClick={handlePrevWeek}
                    className="p-1 rounded-full hover:bg-accent transition-colors cursor-pointer"
                    title="이전 주"
                >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border">
                    <span className="text-sm font-medium text-foreground">{dateRangeStr}</span>
                    <div className="relative group flex items-center cursor-pointer">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <input
                            type="date"
                            value={currentDate}
                            onChange={handleDateSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="날짜 선택"
                        />
                    </div>
                </div>

                <button
                    onClick={handleNextWeek}
                    disabled={isNextWeekFuture()}
                    className={`p-1 rounded-full transition-colors ${isNextWeekFuture() ? 'opacity-20 cursor-not-allowed' : 'hover:bg-accent cursor-pointer'}`}
                    title="다음 주"
                >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* 주간 총점 */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-center border border-border shadow-sm transition-all duration-300 flex-shrink-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">주간 점수</p>
                <div className="flex items-center justify-center gap-1">
                    <p className="text-3xl font-black text-primary tracking-tight">
                        {data.totalScore.toLocaleString()}
                    </p>
                    <span className="text-sm font-bold text-primary/70 mt-2">점</span>
                </div>
            </div>

            {/* 활동 내역 */}
            <div className="flex flex-col flex-1 min-h-0 gap-3">
                <div className="flex justify-between items-center px-1 flex-shrink-0">
                    <p className="text-sm font-medium text-foreground">활동 내역</p>
                    <span className="text-[10px] text-muted-foreground">{data.activities.length} entries</span>
                </div>

                <div className="custom-scrollbar overflow-y-auto pr-2 flex-1">
                    {data.activities.length > 0 ? (
                        data.activities.map((activity, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between py-3 border-b border-border last:border-b-0 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                                        {getIcon(activity.category, activity.description)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground line-clamp-1">
                                            {activity.description.replace(/^Solved problem: /, '')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{getRelativeTime(activity.createdAt)}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-500 shrink-0">+{activity.amount}점</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center text-muted-foreground text-xs">
                            이번 주 활동 내역이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CCWeeklyScore;
