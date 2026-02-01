import { useState, useEffect, useMemo } from 'react';
import { useMonthlyStreaks } from '../hooks/useProfileQueries';
import { subWeeks, startOfWeek, addDays, format, isSameDay } from 'date-fns';

interface Props {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

export function CCMonthlyActivityCard({ onDateSelect }: Props) {
  const { data: streaks } = useMonthlyStreaks();

  // Grid Constants
  const WEEKS_TO_SHOW = 20;
  const DAYS_IN_WEEK = 7;

  // Calculate grid dates
  // Grid ends at the end of current week or today.
  // Let's make it end at today's week.
  const today = new Date();

  // Generate the dates for the grid (20 columns * 7 rows)
  // We want the last column to include today.
  // So start date is roughly 20 weeks ago.

  // Determine the start date of the grid:
  // (Today's start of week) - (WEEKS_TO_SHOW - 1) weeks
  const gridStartDate = useMemo(() => {
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
    return subWeeks(currentWeekStart, WEEKS_TO_SHOW - 1);
  }, []);

  // Helper to get activity level from count
  const getLevel = (count: number) => {
    if (count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  // Convert API data to a Map for O(1) lookup
  const streakMap = useMemo(() => {
    const map = new Map<string, number>();
    if (streaks) {
      streaks.forEach((s) => {
        map.set(s.date, s.count);
      });
    }
    return map;
  }, [streaks]);

  // Generate Grid Data: Array of Weeks (each week is Array of Days)
  // Each cell: { date: Date, level: number, count: number }
  const grid = useMemo(() => {
    const result = [];
    let currentDate = gridStartDate;

    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const week = [];
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const count = streakMap.get(dateStr) || 0;

        week.push({
          date: new Date(currentDate),
          count,
          level: getLevel(count),
          dateStr,
        });

        currentDate = addDays(currentDate, 1);
      }
      result.push(week);
    }
    return result;
  }, [gridStartDate, streakMap]);

  const getColorClass = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-green-200';
      case 2:
        return 'bg-green-300';
      case 3:
        return 'bg-green-400';
      case 4:
        return 'bg-green-600';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 text-sm flex items-center gap-1 font-medium">
          <span>🌱</span> 스트릭
        </h3>
        {/* Year Dropdown Mock - Can be updated if needed */}
        <select className="text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer">
          <option>{today.getFullYear()}</option>
        </select>
      </div>
      {/* Month Labels (Simplified - Logic can be added to show actual months based on gridStartDate) */}
      <div className="flex ml-8 mb-2 text-xs text-gray-400 gap-12">
        {/* Simple static labels for now, or dynamic could be better but simplified requested */}
        <span>{format(grid[0]?.[0]?.date || new Date(), 'MMM')}</span>
        <span>{format(grid[4]?.[0]?.date || new Date(), 'MMM')}</span>
        <span>{format(grid[8]?.[0]?.date || new Date(), 'MMM')}</span>
        <span>{format(grid[12]?.[0]?.date || new Date(), 'MMM')}</span>
        <span>{format(grid[16]?.[0]?.date || new Date(), 'MMM')}</span>
      </div>
      <div className="flex gap-2">
        {/* Day Labels */}
        <div className="flex flex-col justify-between text-[10px] text-gray-400 h-[100px] py-1">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        {/* The Grid */}
        <div className="flex gap-1 flex-1 overflow-x-auto pb-2">
          {grid.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1 shrink-0">
              {week.map((dayData, dIdx) => (
                <div
                  key={dIdx}
                  onClick={() => onDateSelect(dayData.date)}
                  className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-transform hover:scale-125 hover:border-black border border-transparent ${getColorClass(dayData.level)}`}
                  title={`${dayData.dateStr}: ${dayData.count} activities`}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-2.5 h-2.5 bg-gray-100 rounded-sm"></div>
        <div className="w-2.5 h-2.5 bg-green-200 rounded-sm"></div>
        <div className="w-2.5 h-2.5 bg-green-400 rounded-sm"></div>
        <div className="w-2.5 h-2.5 bg-green-600 rounded-sm"></div>
        <span>More</span>
      </div>
    </div>
  );
}
