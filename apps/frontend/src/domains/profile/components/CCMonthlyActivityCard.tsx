import { useState, useEffect } from 'react';

interface Props {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

export function CCMonthlyActivityCard({ onDateSelect }: Props) {
  // Mock Data: Contribution Graph like structure
  // This is a simplified version. In real app, calculate exact dates.
  const weeks = 20; // Show last 20 weeks roughly
  const days = 7;

  // Helper to generate mock data
  const generateGrid = (): number[][] => {
    const grid: number[][] = [];
    for (let w = 0; w < weeks; w++) {
      const week: number[] = [];
      for (let d = 0; d < days; d++) {
        // Random activity level: 0 (none) to 4 (high)
        week.push(Math.floor(Math.random() * 5));
      }
      grid.push(week);
    }
    return grid;
  };

  const generateEmptyGrid = (): number[][] => {
    const grid: number[][] = [];
    for (let w = 0; w < weeks; w++) {
      grid.push(new Array<number>(days).fill(0));
    }
    return grid;
  };

  const [gridData, setGridData] = useState<number[][]>(generateEmptyGrid());

  useEffect(() => {
    setGridData(generateGrid());
  }, []);

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
        {/* Year Dropdown Mock */}
        <select className="text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer">
          <option>2026</option>
          <option>2025</option>
        </select>
      </div>
      {/* Month Labels (Simplified) */}
      <div className="flex ml-8 mb-2 text-xs text-gray-400 gap-12">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
      </div>
      <div className="flex gap-2">
        {/* Day Labels */}
        <div className="flex flex-col justify-between text-[10px] text-gray-400 h-[100px] py-1">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        {/* The Grid */}
        <div className="flex gap-1 flex-1 overflow-x-auto pb-2 scrollbar-hide">
          {gridData.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1 shrink-0">
              {week.map((level, dIdx) => (
                <div
                  key={dIdx}
                  onClick={() => onDateSelect(new Date())} // 실제로는 날짜 계산해서 넣어야 함
                  className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-transform hover:scale-125 hover:border-black border border-transparent ${getColorClass(level)}`}
                  title={`Activity Level: ${level}`}
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
