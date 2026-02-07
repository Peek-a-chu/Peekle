'use client';

import { useState, useMemo } from 'react';
import { Flame, ChevronDown } from 'lucide-react';
import { useActivityStreak } from '../hooks/useDashboardData';
import { ActivityStreakData } from '../mocks/dashboardMocks';

interface ActivityStreakProps {
  onDateSelect?: (date: string) => void;
  selectedDate?: string | null;
  nickname?: string;
  initialData?: ActivityStreakData[];
}

// 사용 가능한 년도들 (동적 생성)
const MIN_VISIBLE_YEAR = 2025;

const getKstToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '01');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '01');

  return { year, month, day };
};

const KST_TODAY = getKstToday();
const CURRENT_YEAR = KST_TODAY.year;
const MIN_MONTH_LABEL_GAP_WEEKS = 3;

interface DayCell {
  date: string | null;
  count: number;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ActivityStreak = ({
  onDateSelect,
  selectedDate: externalSelectedDate,
  nickname,
  initialData,
}: ActivityStreakProps) => {
  // If initialData is provided, use it. Otherwise, fetch via hook.
  const { data: fetchedData } = useActivityStreak(initialData ? undefined : nickname);
  const allData = initialData || fetchedData;

  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  // 외부 prop이 있으면 그것을 사용, 없으면 내부 state 사용
  const selectedDate =
    externalSelectedDate !== undefined ? externalSelectedDate : internalSelectedDate;

  // 사용 가능한 년도 계산 (데이터 기반 + 현재 년도)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(CURRENT_YEAR); // 현재 년도는 항상 포함

    for (let year = MIN_VISIBLE_YEAR; year <= CURRENT_YEAR; year += 1) {
      years.add(year);
    }

    allData.forEach((item) => {
      const year = new Date(item.date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => a - b);
  }, [allData]);

  const weekData = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate =
      selectedYear === CURRENT_YEAR
        ? new Date(selectedYear, KST_TODAY.month - 1, KST_TODAY.day)
        : new Date(selectedYear, 11, 31);
    const dataMap = new Map(allData.map((item) => [item.date, item.count]));

    const fullDates: DayCell[] = [];
    const leadingPlaceholders = startDate.getDay();
    for (let i = 0; i < leadingPlaceholders; i += 1) {
      fullDates.push({ date: null, count: 0 });
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatLocalDate(d);
      fullDates.push({ date: dateStr, count: dataMap.get(dateStr) || 0 });
    }

    const trailingPlaceholders = (7 - (fullDates.length % 7)) % 7;
    for (let i = 0; i < trailingPlaceholders; i += 1) {
      fullDates.push({ date: null, count: 0 });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < fullDates.length; i += 7) {
      weeks.push(fullDates.slice(i, i + 7));
    }

    return weeks;
  }, [allData, selectedYear]);

  // 색상 계산 (문제 풀이 수에 따라)
  const getColor = (count: number) => {
    if (count === 0) return 'bg-primary/10';
    if (count <= 2) return 'bg-primary/30';
    if (count <= 4) return 'bg-primary/60';
    return 'bg-primary';
  };

  // 해당 년도 총 문제 수 계산
  const totalProblems = useMemo(() => {
    return weekData.flat().reduce((sum, item) => sum + (item.date ? item.count : 0), 0);
  }, [weekData]);

  // 날짜 클릭 핸들러
  const handleDateClick = (date: string) => {
    if (externalSelectedDate === undefined) {
      setInternalSelectedDate(date);
    }
    onDateSelect?.(date);
  };

  const monthLabelPositions = useMemo(() => {
    const labels: { label: string; weekIndex: number; month: number }[] = [];
    const seen = new Set<number>();

    weekData.forEach((week, weekIndex) => {
      week.forEach((day) => {
        if (!day.date) return;
        const month = Number(day.date.slice(5, 7));
        const dayOfMonth = Number(day.date.slice(8, 10));
        if (dayOfMonth === 1 && !seen.has(month)) {
          seen.add(month);
          labels.push({ label: `${String(month).padStart(2, '0')}월`, weekIndex, month });
        }
      });
    });

    if (!labels.some((item) => item.month === 1)) {
      labels.unshift({ label: '01월', weekIndex: 0, month: 1 });
    }

    const filtered: { label: string; weekIndex: number }[] = [];
    let lastWeekIndex = -MIN_MONTH_LABEL_GAP_WEEKS;
    labels.forEach((item) => {
      if (item.weekIndex - lastWeekIndex < MIN_MONTH_LABEL_GAP_WEEKS) {
        if (item.month === 12 && filtered.length > 0) {
          filtered[filtered.length - 1] = { label: item.label, weekIndex: item.weekIndex };
          lastWeekIndex = item.weekIndex;
        }
        return;
      }
      filtered.push({ label: item.label, weekIndex: item.weekIndex });
      lastWeekIndex = item.weekIndex;
    });

    return filtered;
  }, [weekData]);

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
              {availableYears.map((year) => (
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
      <div className="w-full p-1">
        <div className="w-full relative">
          <div className="relative h-4 mb-2">
            {monthLabelPositions.map((item) => (
              <span
                key={`${item.label}-${item.weekIndex}`}
                className="absolute text-[10px] text-muted-foreground/70"
                style={{
                  left: `${(item.weekIndex / 53) * 100}%`,
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
          <div
            className="grid gap-1 w-full"
            style={{
              gridTemplateColumns: 'repeat(53, minmax(0, 1fr))',
            }}
          >
            {weekData.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                {week.map((day, dayIndex) =>
                  day.date ? (
                    <button
                      key={day.date}
                      onClick={() => handleDateClick(day.date as string)}
                      className={`w-full max-w-[14px] justify-self-center aspect-square rounded-[2px] transition-all ${getColor(day.count)} ${
                        selectedDate === day.date
                          ? 'ring-1 ring-primary ring-offset-1 relative z-10'
                          : 'hover:ring-1 hover:ring-border'
                      }`}
                      title={`${day.date}: ${day.count}문제`}
                    />
                  ) : (
                    <div
                      key={`empty-${weekIndex}-${dayIndex}`}
                      className="w-full max-w-[14px] justify-self-center aspect-square"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>적음</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-primary/10" />
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
