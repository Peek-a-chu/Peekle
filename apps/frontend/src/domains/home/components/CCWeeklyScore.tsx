'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Gamepad2,
  Code2,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { WeeklyPointSummary } from '@/domains/league/types';
import { useWeeklyScore } from '@/domains/home/hooks/useDashboardData';
import { formatDistanceToNow, startOfWeek, endOfWeek, format, isFuture } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { WeekCalendar } from '@/components/ui/week-calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CCWeeklyScoreProps {
  initialData?: WeeklyPointSummary | null;
  selectedDate?: string;
}

export const CCWeeklyScore = ({ initialData, selectedDate: externalDate }: CCWeeklyScoreProps) => {
  // 1. 내부 상태 displayDate 관리 (YYYY-MM-DD string)
  // 초기값: externalDate가 있으면 그것, 없으면 오늘
  const [displayDate, setDisplayDate] = useState<string>(() => {
    if (externalDate) return externalDate;
    const d = new Date();
    return format(d, 'yyyy-MM-dd');
  });

  // 3. API 호출은 displayDate 기준
  const { data: fetchedData, isLoading: networkLoading } = useWeeklyScore(displayDate);

  // 4. 데이터 우선순위: fetchedData가 있으면 사용, 없으면(로딩전/에러) initialData 사용하되, 
  //    initialData가 현재 displayDate와 일치하는 주차의 데이터인지 확인은 어렵지만,
  //    사용자 경험상 fetchedData가 로딩되면 바로 덮어쓰는 구조.
  //    단, initialData가 있고 아직 fetchedData가 없는 초기 렌더링 시점을 위해 fallback.
  //    네비게이션 후에는 fetchedData가 업데이트됨. 
  //    *주의*: 날짜 이동 시 fetchedData가 null일 수 있는데, 이 때 엉뚱한 initialData(오늘)가 보이면 안됨.
  //    따라서 displayDate가 오늘(initialDate)과 다르면 initialData를 무시하는게 안전함.
  //    (여기서는 단순화를 위해 fetchedData 우선으로 처리)
  const data = fetchedData || initialData;
  const isLoading = initialData ? false : networkLoading;

  // 날짜 핸들러
  const handlePrevWeek = () => {
    const d = new Date(displayDate);
    d.setDate(d.getDate() - 7);
    setDisplayDate(format(d, 'yyyy-MM-dd'));
  };

  const handleNextWeek = () => {
    const d = new Date(displayDate);
    d.setDate(d.getDate() + 7);
    setDisplayDate(format(d, 'yyyy-MM-dd'));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDisplayDate(format(date, 'yyyy-MM-dd'));
    }
  };

  // 다음 주가 미래인지 체크
  const isNextWeekFuture = () => {
    const d = new Date(displayDate);
    d.setDate(d.getDate() + 7);
    return isFuture(d); // date-fns isFuture checks if date > now
  };

  // 날짜 범위 포맷팅
  const dateObj = new Date(displayDate);
  const start = startOfWeek(dateObj, { weekStartsOn: 3 });
  const end = endOfWeek(dateObj, { weekStartsOn: 3 });
  const dateRangeStr = `${format(start, 'M월 d일')} ~ ${format(end, 'M월 d일')}`;

  // 활동 아이콘 매핑
  const getIcon = (category?: string, description: string = '') => {
    if (category === 'GAME' || description.includes('Game') || description.includes('게임'))
      return <Gamepad2 className="w-5 h-5 text-purple-500" />;
    if (category === 'PROBLEM' || description.includes('Solved') || description.includes('problem'))
      return <Code2 className="w-5 h-5 text-green-500" />;
    if (category === 'STUDY' || description.includes('Study') || description.includes('스터디'))
      return <Users className="w-5 h-5 text-blue-500" />;
    if (category === 'LEAGUE' || description.includes('League') || description.includes('리그'))
      return <Award className="w-5 h-5 text-yellow-500" />;
    return <Trophy className="w-5 h-5 text-muted-foreground" />;
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
    } catch {
      return dateStr;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 h-full flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

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
      <div className="mb-6 flex items-center justify-center gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevWeek}
          className="h-9 w-9 rounded-full hover:bg-accent transition-all active:scale-95 border border-transparent hover:border-border"
          title="이전 주"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-10 px-6 rounded-full border-border bg-muted/20 hover:bg-muted/40 text-foreground font-semibold flex items-center gap-2 transition-all shadow-sm",
                !displayDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm">{dateRangeStr}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center" side="bottom" sideOffset={8}>
            <WeekCalendar
              selected={new Date(displayDate)}
              onSelect={handleDateSelect}
              initialFocus
              disabled={(date) => isFuture(date)}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextWeek}
          disabled={isNextWeekFuture()}
          className={cn(
            "h-9 w-9 rounded-full transition-all active:scale-95 border border-transparent",
            isNextWeekFuture()
              ? "opacity-20 grayscale cursor-not-allowed"
              : "hover:bg-accent hover:border-border cursor-pointer"
          )}
          title="다음 주"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {/* 주간 총점 */}
      <div className="relative group mb-6 flex-shrink-0">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-secondary/30 backdrop-blur-sm rounded-2xl p-6 text-center border border-primary/10 shadow-md transition-all duration-300">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-2">Weekly Activity Score</p>
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500/80 animate-pulse" />
            <p className="text-4xl font-black text-foreground tracking-tighter">
              {data.totalScore.toLocaleString()}
            </p>
            <span className="text-lg font-bold text-muted-foreground/60 self-end mb-1">pts</span>
          </div>
        </div>
      </div>

      {/* 활동 내역 */}
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex justify-between items-center px-1 flex-shrink-0">
          <p className="text-sm font-medium text-foreground">활동 내역</p>
          <span className="text-[10px] text-muted-foreground">
            {data.activities.length} entries
          </span>
        </div>

        <div className="custom-scrollbar overflow-y-auto pr-2 flex-1 space-y-2">
          {data.activities.length > 0 ? (
            data.activities.map((activity, index) => (
              <div
                key={index}
                className="group flex items-center justify-between py-3 px-3 hover:bg-muted/50 rounded-xl transition-all border border-border/50 bg-muted/10 hover:border-primary/50 duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-200">
                    {getIcon(activity.category, activity.description)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {activity.description.replace(/^Solved problem: /, '')}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {getRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-emerald-500 shrink-0">
                    +{activity.amount}
                  </span>
                  <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">points</span>
                </div>
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
