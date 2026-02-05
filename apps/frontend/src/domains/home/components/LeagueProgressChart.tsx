'use client';

import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useLeagueProgress } from '../hooks/useDashboardData';
import { LEAGUE_NAMES, LEAGUE_ORDER, LEAGUE_COLORS } from '@/components/LeagueIcon';
import { LeagueProgressData } from '../mocks/dashboardMocks';
import { LEAGUE_ICONS } from '@/assets/icons/league';

// 한 화면에 보여줄 주 수
const VISIBLE_WEEKS = 10;

// 커스텀 툴팁
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: LeagueProgressData }[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const league = data.league;

  // 날짜 포맷 (MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-card rounded-lg shadow-lg border border-border p-3 min-w-[140px]">
      {/* 리그명 */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: LEAGUE_COLORS[league] }}
        />
        <span className="font-bold text-sm text-foreground">{LEAGUE_NAMES[league]}</span>
      </div>

      {/* 점수 - 한 줄로 */}
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-[10px] text-muted-foreground">SCORE</span>
        <span className="text-base font-bold text-primary">{data.score.toLocaleString()}점</span>
      </div>

      {/* 구분선 */}
      <div className="border-t border-border my-1.5" />

      {/* 기간 - 더 작게 */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-muted-foreground">PERIOD</span>
        <span className="text-[10px] text-muted-foreground/80">
          {formatDate(data.date)} ~ {formatDate(data.periodEnd)}
        </span>
      </div>
    </div>
  );
};

interface LeagueProgressChartProps {
  initialData?: LeagueProgressData[];
}

const LeagueProgressChart = ({ initialData }: LeagueProgressChartProps) => {
  const { data: fetchedData } = useLeagueProgress({ skip: !!initialData });
  const allData = initialData || fetchedData;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 현재 보이는 시작 인덱스 (마지막 10주부터 시작)
  const [startIndex, setStartIndex] = useState(Math.max(0, allData.length - VISIBLE_WEEKS));

  // 현재 보이는 데이터
  const visibleData = useMemo(() => {
    return allData.slice(startIndex, startIndex + VISIBLE_WEEKS);
  }, [allData, startIndex]);

  // 이전/다음 버튼 핸들러
  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - VISIBLE_WEEKS));
  };

  const handleNext = () => {
    setStartIndex((prev) => Math.min(allData.length - VISIBLE_WEEKS, prev + VISIBLE_WEEKS));
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const selectedDate = new Date(e.target.value);

    // 선택한 날짜 이후의 첫 번째 데이터 인덱스 찾기
    const targetIndex = allData.findIndex((d) => new Date(d.date) >= selectedDate);

    if (targetIndex !== -1) {
      // 해당 날짜가 화면의 중간쯤 오도록 (-5주)
      const newStart = Math.max(0, targetIndex - VISIBLE_WEEKS / 2);
      setStartIndex(Math.min(newStart, allData.length - VISIBLE_WEEKS));
    } else {
      // 미래 날짜면 마지막으로 이동
      setStartIndex(Math.max(0, allData.length - VISIBLE_WEEKS));
    }
  };

  // 버튼 활성화 상태
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + VISIBLE_WEEKS < allData.length;

  // 현재 기간 표시 텍스트
  const dateRangeText = useMemo(() => {
    if (visibleData.length === 0) return '';
    const first = visibleData[0];
    const last = visibleData[visibleData.length - 1];
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };
    return `${formatDate(first.date)} - ${formatDate(last.periodEnd)}`;
  }, [visibleData]);

  // 데이터에서 유동적 Y축 범위 계산
  const { yMin, yMax, visibleLeagues, ticks } = useMemo(() => {
    if (!visibleData.length) {
      return { yMin: 0, yMax: 7, visibleLeagues: LEAGUE_ORDER, ticks: [0, 1, 2, 3, 4, 5, 6, 7] };
    }

    const indices = visibleData.map((d) => d.leagueIndex);
    const minIdx = Math.min(...indices);
    const maxIdx = Math.max(...indices);

    // ±1 여유분 (최소 3개 리그 표시)
    const rangeMin = Math.max(0, minIdx - 1);
    const rangeMax = Math.min(7, maxIdx + 1);

    // 최소 3단계 범위 보장
    let finalMin = rangeMin;
    let finalMax = rangeMax;
    if (finalMax - finalMin < 2) {
      if (finalMin > 0) finalMin = Math.max(0, finalMax - 2);
      if (finalMax < 7) finalMax = Math.min(7, finalMin + 2);
    }

    const leagues = LEAGUE_ORDER.slice(finalMin, finalMax + 1);
    const tickValues = Array.from({ length: finalMax - finalMin + 1 }, (_, i) => finalMin + i);

    return { yMin: finalMin, yMax: finalMax, visibleLeagues: leagues, ticks: tickValues };
  }, [visibleData]);

  // X축 날짜 포맷터
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  // Y축 아이콘들 (역순: 위가 높은 티어)
  const yAxisIcons = [...visibleLeagues].reverse();

  return (
    <div className="bg-card border border-border rounded-2xl p-6 transition-colors duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">리그 변화 추이</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`p-1 rounded-full transition-colors ${canGoPrev ? 'hover:bg-muted cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground text-center font-medium">
            {dateRangeText}
          </span>

          {/* 달력 아이콘 (Date Picker) */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            <input
              type="date"
              onChange={handleDateSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="날짜로 이동"
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`p-1 rounded-full transition-colors ${canGoNext ? 'hover:bg-muted cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="flex">
        {/* Y축 아이콘 열 */}
        <div className="flex flex-col justify-between h-[200px] pr-2">
          {yAxisIcons.map((league) => {
            const leagueKey = league.toLowerCase() as keyof typeof LEAGUE_ICONS;
            const iconAsset = LEAGUE_ICONS[leagueKey] || LEAGUE_ICONS.stone;
            return (
              <div
                key={league}
                className="flex items-center justify-center"
                style={{ height: `${100 / yAxisIcons.length}%` }}
              >
                <Image
                  src={iconAsset}
                  alt={LEAGUE_NAMES[league as keyof typeof LEAGUE_NAMES] || LEAGUE_NAMES[league.toLowerCase() as keyof typeof LEAGUE_NAMES]}
                  width={18}
                  height={18}
                />
              </div>
            );
          })}
        </div>

        {/* 차트 */}
        <div className="flex-1 h-[200px] min-w-0">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
              <AreaChart data={visibleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeague" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'currentColor', className: 'text-muted-foreground' }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  ticks={ticks}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  width={0}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="leagueIndex"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLeague)"
                  dot={false}
                  activeDot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary rounded-full" />
          <span>*주간 기준: 매주 수요일 6:00 ~ 다음 수요일 5:59</span>
        </div>
      </div>
    </div>
  );
};

export default LeagueProgressChart;
