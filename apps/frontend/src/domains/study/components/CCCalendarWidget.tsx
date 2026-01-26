'use client';

import * as React from 'react';
import { ko } from 'date-fns/locale';
import { format, isAfter, startOfToday } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DayPicker } from 'react-day-picker';

interface CCCalendarWidgetProps {
  selectedDate: Date;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function CCCalendarWidget({
  selectedDate,
  isOpen,
  onToggle,
  className,
}: CCCalendarWidgetProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'flex items-center gap-2 pl-2 pr-2 font-normal hover:bg-accent w-fit',
        isOpen && 'bg-accent',
        className,
      )}
      onClick={onToggle}
      aria-label="날짜 선택"
    >
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      <span>{format(selectedDate, 'yy/MM/dd')}</span>
      {isOpen ? (
        <ChevronUp className="h-3 w-3 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  );
}

interface CCInlineCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  className?: string;
  historyDates?: Date[];
}

export function CCInlineCalendar({
  selectedDate,
  onSelectDate,
  className,
  historyDates = [],
}: CCInlineCalendarProps) {
  const today = startOfToday();

  return (
    <div className={cn('border-b border-border bg-card px-3 py-3 shrink-0 relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-5 top-4 z-10 h-7 px-2 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-accent rounded-md"
        onClick={() => onSelectDate(today)}
      >
        오늘로 이동
      </Button>
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelectDate(date)}
        locale={ko}
        disabled={(date) => isAfter(date, today)}
        modifiers={{
          hasHistory: historyDates,
        }}
        showOutsideDays
        className="w-full"
        classNames={{
          months: 'flex flex-col w-full',
          month: 'w-full',
          month_caption: 'flex justify-between items-center h-9 mb-2 px-1',
          caption_label: 'text-sm font-semibold',
          nav: 'flex items-center gap-1',
          button_previous:
            'h-7 w-7 bg-transparent p-0 hover:bg-accent rounded-md inline-flex items-center justify-center transition-colors',
          button_next:
            'h-7 w-7 bg-transparent p-0 hover:bg-accent rounded-md inline-flex items-center justify-center transition-colors',
          month_grid: 'w-full border-collapse',
          weekdays: 'flex w-full justify-between mb-1',
          weekday:
            'text-muted-foreground font-medium text-xs w-8 h-8 flex items-center justify-center',
          week: 'flex w-full justify-between',
          day: 'h-8 w-8 text-center text-sm p-0',
          day_button:
            'h-8 w-8 p-0 font-normal rounded-md inline-flex items-center justify-center transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1',
          selected: 'bg-pink-500 text-white hover:bg-pink-600 focus:bg-pink-600',
          today: 'bg-muted font-semibold',
          outside: 'text-muted-foreground/40',
          disabled: 'text-muted-foreground/30 cursor-not-allowed hover:bg-transparent',
          hidden: 'invisible',
        }}
        modifiersClassNames={{
          hasHistory:
            'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-pink-500 after:rounded-full',
        }}
        components={{
          Chevron: ({ orientation }) =>
            orientation === 'left' ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
      />
    </div>
  );
}
