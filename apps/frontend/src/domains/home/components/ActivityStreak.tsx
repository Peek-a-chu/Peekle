'use client';

import { useState, useMemo } from 'react';
import { Flame, ChevronDown } from 'lucide-react';
import { useActivityStreak } from '../hooks/useDashboardData';

interface ActivityStreakProps {
    onDateSelect?: (date: string) => void;
}

// 사용 가능한 년도들 (목업용)
const AVAILABLE_YEARS = [2024, 2025, 2026];

const ActivityStreak = ({ onDateSelect }: ActivityStreakProps) => {
    const { data: allData } = useActivityStreak();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(2025);

    // 선택된 년도 데이터만 필터링
    const yearData = useMemo(() => {
        return allData.filter((item) => {
            const year = new Date(item.date).getFullYear();
            return year === selectedYear;
        });
    }, [allData, selectedYear]);

    // 데이터를 월별로 그룹화
    const monthlyData = useMemo(() => {
        const months: { [key: string]: { date: string; count: number }[] } = {};

        yearData.forEach((item) => {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!months[monthKey]) {
                months[monthKey] = [];
            }
            months[monthKey].push(item);
        });

        return months;
    }, [yearData]);

    // 색상 계산 (문제 풀이 수에 따라)
    const getColor = (count: number) => {
        if (count === 0) return 'bg-muted/30';
        if (count <= 2) return 'bg-primary/30';
        if (count <= 4) return 'bg-primary/60';
        return 'bg-primary';
    };

    // 해당 년도 총 문제 수 계산
    const totalProblems = useMemo(() => {
        return yearData.reduce((sum, item) => sum + item.count, 0);
    }, [yearData]);

    // 날짜 클릭 핸들러
    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        onDateSelect?.(date);
    };

    // 월 이름 포맷
    const formatMonth = (monthKey: string) => {
        const [, month] = monthKey.split('-');
        return `${month}월`;
    };

    return (
        <div className="p-6 transition-colors duration-300">
            {/* 헤더 */}
            <div className="flex flex-col gap-4 mb-6">
                {/* 1행: 제목 */}
                <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">활동 스트릭</h3>
                </div>

                {/* 2행: 컨트롤 그룹 (문제수 + 년도) */}
                <div className="flex items-center justify-between">
                    {/* 총 문제 수 */}
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">
                            {totalProblems.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">문제</span>
                    </div>

                    {/* 년도 선택 (드롭다운) */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-muted/30 border border-border text-muted-foreground text-sm font-medium py-1.5 pl-3 pr-8 rounded-lg cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        >
                            {AVAILABLE_YEARS.map((year) => (
                                <option key={year} value={year}>
                                    {year}년
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* 히트맵 */}
            <div className="overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-1 min-w-max">
                    {Object.entries(monthlyData).map(([monthKey, days]) => (
                        <div key={monthKey} className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground/70 mb-1 h-3">
                                {formatMonth(monthKey)}
                            </span>
                            <div className="grid grid-rows-7 grid-flow-col gap-px">
                                {days.map((day) => (
                                    <button
                                        key={day.date}
                                        onClick={() => handleDateClick(day.date)}
                                        className={`w-2.5 h-2.5 rounded-[2px] transition-all ${getColor(day.count === 0 ? 0 : day.count)} ${selectedDate === day.date
                                                ? 'ring-1 ring-primary ring-offset-1'
                                                : 'hover:ring-1 hover:ring-border'
                                            }`}
                                        title={`${day.date}: ${day.count}문제`}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                <span>적음</span>
                <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-sm bg-muted/30" />
                    <div className="w-3 h-3 rounded-sm bg-primary/30" />
                    <div className="w-3 h-3 rounded-sm bg-primary/60" />
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                </div>
                <span>많음</span>
            </div>
        </div>
    );
};

export default ActivityStreak;
