'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type WeekCalendarProps = {
    selected?: Date;
    onSelect?: (date: Date | undefined) => void;
    className?: string;
};

export function WeekCalendar({ selected, onSelect, className }: WeekCalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState<Date>(
        selected || startOfMonth(new Date()),
    );
    const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

    // 현재 표시할 달의 첫날과 마지막날
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);

    // 달력 그리드에 표시될 전체 범위 (이전/다음 달 날짜 포함)
    // 일반적인 달력처럼 일요일부터 시작하도록 설정
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    // 수요일~화요일 범위 계산 함수
    const getWeekRange = (date: Date) => {
        const start = startOfWeek(date, { weekStartsOn: 3 });
        const end = endOfWeek(date, { weekStartsOn: 3 });
        return { start, end };
    };

    // 선택된 범위
    const range = React.useMemo(() => {
        if (!selected) return null;
        return getWeekRange(selected);
    }, [selected]);

    // 호버된 범위
    const hoverRange = React.useMemo(() => {
        if (!hoveredDate) return null;
        return getWeekRange(hoveredDate);
    }, [hoveredDate]);

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className={cn('w-72 bg-card p-3 rounded-md border shadow-sm', className)}>
            {/* Header */}
            <div className="flex justify-between items-center h-9 mb-4 px-1">
                <span className="text-sm font-semibold">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePreviousMonth}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-7 w-7 p-0 opacity-50 hover:opacity-100',
                        )}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-7 w-7 p-0 opacity-50 hover:opacity-100',
                        )}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* WeekDays Header */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="text-muted-foreground font-medium text-xs h-8 flex items-center justify-center"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHoveredDate(null)}>
                {days.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const inRange = range && isWithinInterval(day, range);
                    const inHoverRange = hoverRange && isWithinInterval(day, hoverRange);

                    const isRangeStart = range && isSameDay(day, range.start);
                    const isRangeEnd = range && isSameDay(day, range.end);
                    const isHoverStart = hoverRange && isSameDay(day, hoverRange.start);
                    const isHoverEnd = hoverRange && isSameDay(day, hoverRange.end);

                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                'h-8 relative flex items-center justify-center transition-all',
                                inRange && 'bg-accent',
                                !inRange && inHoverRange && 'bg-accent/40',
                                isRangeStart && 'rounded-l-full',
                                isRangeEnd && 'rounded-r-full',
                                !inRange && isHoverStart && 'rounded-l-full',
                                !inRange && isHoverEnd && 'rounded-r-full',
                                idx % 7 === 0 && (inRange || inHoverRange) && 'rounded-l-full',
                                idx % 7 === 6 && (inRange || inHoverRange) && 'rounded-r-full',
                            )}
                        >
                            <button
                                onClick={() => onSelect?.(day)}
                                onMouseEnter={() => setHoveredDate(day)}
                                className={cn(
                                    buttonVariants({ variant: 'ghost' }),
                                    'h-8 w-8 p-0 font-normal rounded-full relative z-10',
                                    !isCurrentMonth && 'text-muted-foreground opacity-30',
                                    isToday &&
                                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                                    !isToday && isCurrentMonth && 'hover:bg-accent/50',
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

WeekCalendar.displayName = 'WeekCalendar';
