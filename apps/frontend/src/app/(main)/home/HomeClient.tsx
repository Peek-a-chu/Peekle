'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { LeagueProgressData, WeeklyPointSummary } from '@/domains/league/types';
import {
  ActivityStreakData,
  TimelineItemData,
  AIRecommendationData,
} from '@/domains/home/mocks/dashboardMocks';
import { LeagueRankingData } from '@/domains/league/types';
import { CalendarDays, Sparkles, Trophy } from 'lucide-react';
import { LEAGUE_NAMES } from '@/components/LeagueIcon';

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
  const formattedDate = (() => {
    const [year, month, day] = initialDate.split('-');
    return `${year}.${month}.${day}`;
  })();
  const leagueLabel = LEAGUE_NAMES[initialLeagueRanking.myLeague] || '스톤';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 bg-background text-foreground transition-colors duration-300">
      <section className="xl:hidden mb-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">오늘도 반가워요</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {user?.nickname ? `${user.nickname}님` : 'Peekler'}의 학습 대시보드
            </h2>
          </div>
          <div className="rounded-full bg-card/80 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            Mobile
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formattedDate}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card/90 p-2.5">
            <p className="text-[11px] text-muted-foreground">이번 주 포인트</p>
            <p className="mt-1 text-base font-bold text-foreground">
              {initialWeeklyScore?.totalScore?.toLocaleString() ?? 0}점
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/90 p-2.5">
            <p className="text-[11px] text-muted-foreground">현재 리그</p>
            <p className="mt-1 text-base font-bold text-foreground">
              <Trophy className="mr-1 inline h-3.5 w-3.5 text-yellow-500" />
              {leagueLabel}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            href="/study"
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-center text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            스터디 바로가기
          </Link>
          <Link
            href="/search"
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            문제 검색
          </Link>
        </div>
      </section>

      <div>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] xl:gap-10 gap-6 pt-0 xl:pt-2">
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
                                    <CCWeeklyScore selectedDate={selectedDate || undefined} />
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

      {/* 홈 화면 전용 푸터 */}
      <footer className="mt-24 py-10 flex flex-col items-center justify-center gap-4 text-[#6B7280] text-sm">
        <div className="flex items-center gap-4 font-medium">
          <span className="flex items-center gap-1">
            Contact : taesun4767@gmail.com
          </span>
          <span className="text-border/50">|</span>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScGhVj0MPivuyxrjrWQQaEMZzWqU9p-k-A-lnJJ7Q4cWh9bVg/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors flex items-center gap-1 underline underline-offset-4"
          >
            피드백 및 건의사항 남기기
          </a>
        </div>
        <p>© 2026 Peekle. All rights reserved.</p>
      </footer>
    </div>
  );
}
