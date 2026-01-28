'use client';

import { useState } from 'react';
import LeagueProgressChart from '@/domains/home/components/LeagueProgressChart';
import ActivityStreak from '@/domains/home/components/ActivityStreak';
import LearningTimeline from '@/domains/home/components/LearningTimeline';
import AIRecommendation from '@/domains/home/components/AIRecommendation';
import WeeklyScoreCard from '@/domains/home/components/WeeklyScoreCard';
import LeagueRanking from '@/domains/home/components/LeagueRanking';

import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 transition-colors duration-300">
      {/* 벤또 그리드 레이아웃 */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* 왼쪽 메인 영역 */}
          <div className="space-y-6 order-1 xl:order-1 min-w-0">
            {/* 리그 변화 추이 */}
            <LeagueProgressChart />
            <div className="border border-card-border rounded-2xl bg-card overflow-hidden">
              {/* 활동 스트릭 */}
              <ActivityStreak onDateSelect={setSelectedDate} />

                            {/* 학습 타임라인 */}
                            <LearningTimeline selectedDate={selectedDate} showHistoryLink={true} nickname={user?.nickname} />
                        </div>
                        {/* AI 추천 & 주간 점수 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AIRecommendation />
                            <WeeklyScoreCard />
                        </div>
                    </div>

          {/* 오른쪽 사이드바 - 리그 순위 */}
          <div className="order-2 xl:order-2">
            <div className="xl:sticky xl:top-6">
              <LeagueRanking />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
