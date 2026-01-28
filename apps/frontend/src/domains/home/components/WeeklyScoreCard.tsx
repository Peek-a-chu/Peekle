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
} from 'lucide-react';
import { useWeeklyScore } from '../hooks/useDashboardData';
import { MOCK_WEEKLY_SCORES } from '../mocks/dashboardMocks';

const WeeklyScoreCard = () => {
  const [selectedDate, setSelectedDate] = useState(MOCK_WEEKLY_SCORES[0].date);
  const { data } = useWeeklyScore(selectedDate);

  // 인덱스 기반 이동을 위해 현재 인덱스 찾기
  const currentIndex = MOCK_WEEKLY_SCORES.findIndex((s) => s.date === selectedDate);
  const canGoNext = currentIndex > 0;
  const canGoPrev = currentIndex < MOCK_WEEKLY_SCORES.length - 1;

  const handlePrev = () => {
    if (canGoPrev) setSelectedDate(MOCK_WEEKLY_SCORES[currentIndex + 1].date);
  };

  const handleNext = () => {
    if (canGoNext) setSelectedDate(MOCK_WEEKLY_SCORES[currentIndex - 1].date);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    // 가장 가까운(이전인) 시작일 찾기 (단순화된 로직)
    const closestWeek =
      MOCK_WEEKLY_SCORES.find((s) => s.date <= date) ||
      MOCK_WEEKLY_SCORES[MOCK_WEEKLY_SCORES.length - 1];
    setSelectedDate(closestWeek.date);
  };

  // 활동 아이콘 매핑
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'study':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-purple-500" />;
      case 'problem':
        return <BookOpen className="w-4 h-4 text-green-500" />;
      case 'league':
        return <Award className="w-4 h-4 text-yellow-500" />;
      default:
        return <Trophy className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 h-full transition-all duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
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
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`p-1 rounded-full transition-colors ${canGoPrev ? 'hover:bg-accent cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}
          title="이전 주"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border">
          <span className="text-sm font-medium text-foreground">{data.dateRange}</span>
          <div className="relative group flex items-center">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors cursor-pointer" />
            <input
              type="date"
              onChange={handleDateSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="날짜 선택"
            />
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={`p-1 rounded-full transition-colors ${canGoNext ? 'hover:bg-accent cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}
          title="다음 주"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* 주간 총점 */}
      <div className="bg-secondary/50 rounded-xl p-4 mb-4 text-center border border-border shadow-sm transition-all duration-300">
        <p className="text-xs text-muted-foreground font-medium mb-1">주간 점수</p>
        <div className="flex items-center justify-center gap-1">
          <p className="text-3xl font-black text-primary tracking-tight">
            {data.totalScore.toLocaleString()}
          </p>
          <span className="text-sm font-bold text-primary/70 mt-2">점</span>
        </div>
      </div>

      {/* 활동 내역 */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">활동 내역</p>
        {data.activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                {getIcon(activity.icon)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{activity.name}</p>
                <p className="text-xs text-muted-foreground">{activity.detail}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-500">+{activity.score}점</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyScoreCard;
