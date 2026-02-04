'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type WeekCalendarProps = Omit<React.ComponentProps<typeof DayPicker>, 'mode'> & {
    selected?: Date;
    onSelect?: (date: Date) => void;
};

function WeekCalendar({ className, classNames, showOutsideDays = true, selected, onSelect, ...props }: WeekCalendarProps) {
    // 내부적으로 Range로 관리하지만, 외부 인터페이스는 단일 Date(해당 주 포함 날짜)로 처리
    const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(
        selected
            ? { from: startOfWeek(selected, { locale: ko }), to: endOfWeek(selected, { locale: ko }) }
            : undefined
    );

    // hover 시 해당 주 전체 하이라이트 효과를 위한 상태
    const [hoverRange, setHoverRange] = React.useState<DateRange | undefined>();

    React.useEffect(() => {
        if (selected) {
            setSelectedRange({
                from: startOfWeek(selected, { locale: ko }),
                to: endOfWeek(selected, { locale: ko }),
            });
        }
    }, [selected]);

    const handleDayClick = (day: Date) => {
        if (day) {
            const from = startOfWeek(day, { locale: ko });
            const to = endOfWeek(day, { locale: ko });
            const newRange = { from, to };
            setSelectedRange(newRange);
            if (onSelect) {
                onSelect(from); // 주 시작일 반환
            }
        }
    };

    const handleDayEnter = (date: Date) => {
        setHoverRange({
            from: startOfWeek(date, { locale: ko }),
            to: endOfWeek(date, { locale: ko })
        });
    };

    const handleDayLeave = () => {
        setHoverRange(undefined);
    };

    // Custom modifiers to highlight the entire week
    const modifiers = {
        hoverRange: hoverRange,
        selectedRange: selectedRange,
    };

    return (
        <DayPicker
            mode="range"
            selected={selectedRange}
            onDayClick={handleDayClick}
            onDayMouseEnter={handleDayEnter}
            onDayMouseLeave={handleDayLeave}
            showOutsideDays={showOutsideDays}
            locale={ko}
            className={cn('p-3', className)}
            classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium',
                nav: 'space-x-1 flex items-center',
                nav_button: cn(
                    buttonVariants({ variant: 'outline' }),
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                ),
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
                ),
                day_range_start: 'day-range-start',
                day_range_end: 'day-range-end',
                day_selected:
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                day_today: 'bg-accent text-accent-foreground',
                day_outside:
                    'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
                day_disabled: 'text-muted-foreground opacity-50',
                day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                day_hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === 'left' ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    ),
            }}
            modifiers={modifiers}
            modifiersClassNames={{
                hoverRange: 'bg-muted/50'
            }}
            {...props}
        />
    );
}
WeekCalendar.displayName = 'WeekCalendar';

export { WeekCalendar };
