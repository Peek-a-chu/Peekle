'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth-store';
import { LeagueProgressData, WeeklyPointSummary } from '@/domains/league/types';
import {
  ActivityStreakData,
  TimelineItemData,
  AIRecommendationData,
} from '@/domains/home/mocks/dashboardMocks';
import { LeagueRankingData } from '@/domains/league/types';

// Dynamic Imports with loading skeletons
const LeagueProgressChart = dynamic(() => import('@/domains/home/components/LeagueProgressChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-2xl" />,
});

const ActivityStreak = dynamic(() => import('@/domains/home/components/ActivityStreak'), {
  loading: () => <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-2xl" />,
});

const LearningTimeline = dynamic(() => import('@/domains/home/components/LearningTimeline'), {
  loading: () => <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-2xl" />,
});

const AIRecommendation = dynamic(() => import('@/domains/home/components/AIRecommendation'), {
  loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-2xl" />,
});

const LeagueRanking = dynamic(() => import('@/domains/home/components/LeagueRanking'), {
  loading: () => <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-2xl" />,
});

import { CCWeeklyScore } from '@/domains/home/components/CCWeeklyScore';

interface HomeClientProps {
  initialLeagueProgress: LeagueProgressData[];
  initialStreak: ActivityStreakData[];
  initialTimeline: TimelineItemData[];
  initialRecommendations: AIRecommendationData[];
  initialWeeklyScore: WeeklyPointSummary | null;
  initialLeagueRanking: LeagueRankingData;
  initialDate: string;
}

export default function HomeClient({
  initialLeagueProgress,
  initialStreak,
  initialTimeline,
  initialRecommendations,
  initialWeeklyScore,
  initialLeagueRanking,
  initialDate,
}: HomeClientProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* 왼쪽 메인 영역 */}
          <div className="space-y-6 order-1 xl:order-1 min-w-0">
            {/* 리그 변화 추이 */}
            <LeagueProgressChart initialData={initialLeagueProgress} />
            <div className="border border-card-border rounded-2xl bg-card overflow-hidden">
              {/* 활동 스트릭 */}
              <ActivityStreak
                onDateSelect={setSelectedDate}
                selectedDate={selectedDate}
                initialData={initialStreak}
              />

              {/* 학습 타임라인 (selectedDate가 initialDate와 다르면 클라이언트 fetch, 같으면 initialData 사용) */}
              <LearningTimeline
                selectedDate={selectedDate}
                showHistoryLink={true}
                nickname={user?.nickname}
                initialData={selectedDate === initialDate ? initialTimeline : undefined}
              />
            </div>
            {/* AI 추천 & 주간 점수 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AIRecommendation initialData={initialRecommendations} />
              <div className="relative min-h-[600px]">
                <div className="h-full md:absolute md:inset-0">
                  <CCWeeklyScore
                    initialData={initialWeeklyScore}
                    selectedDate={selectedDate || undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽 사이드바 - 리그 순위 */}
          <div className="order-2 xl:order-2">
            <div className="xl:sticky xl:top-6">
              <LeagueRanking initialData={initialLeagueRanking} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
