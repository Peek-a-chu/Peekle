import { useState, useEffect } from 'react';
import {
  MOCK_LEAGUE_PROGRESS,
  MOCK_ACTIVITY_STREAK,
  MOCK_TIMELINE,
  MOCK_AI_RECOMMENDATIONS,
  MOCK_WEEKLY_SCORES,
  LeagueProgressData,
  ActivityStreakData,
  TimelineItemData,
  AIRecommendationData,
  WeeklyScoreData,
} from '../mocks/dashboardMocks';
import { DEFAULT_LEAGUE_RANKING } from '@/domains/league/utils';
import { LeagueRankingData } from '@/domains/league/types';
import { getLeagueStatus, getLeagueRules, LeagueRulesMap } from '@/app/api/leagueApi';

// 리그 변화 추이 데이터
export const useLeagueProgress = (): { data: LeagueProgressData[]; isLoading: boolean } => {
  // TODO: API 연동 시 fetch/useSWR로 변경
  return { data: MOCK_LEAGUE_PROGRESS, isLoading: false };
};

// 활동 스트릭 데이터
export const useActivityStreak = (): { data: ActivityStreakData[]; isLoading: boolean } => {
  // TODO: API 연동 시 fetch/useSWR로 변경
  return { data: MOCK_ACTIVITY_STREAK, isLoading: false };
};

// 학습 타임라인 데이터
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useTimeline = (date: string): { data: TimelineItemData[]; isLoading: boolean } => {
  // TODO: API 연동 시 date 파라미터로 해당 날짜 데이터 fetch
  return { data: MOCK_TIMELINE, isLoading: false };
};

// AI 추천 문제 데이터
export const useAIRecommendations = (): { data: AIRecommendationData[]; isLoading: boolean } => {
  // TODO: API 연동 시 fetch/useSWR로 변경
  return { data: MOCK_AI_RECOMMENDATIONS, isLoading: false };
};

// 주간 점수 데이터
export const useWeeklyScore = (date?: string): { data: WeeklyScoreData; isLoading: boolean } => {
  // TODO: API 연동 시 fetch/useSWR로 변경
  if (date) {
    const found = MOCK_WEEKLY_SCORES.find((s: WeeklyScoreData) => s.date === date);
    if (found) return { data: found, isLoading: false };
  }
  return { data: MOCK_WEEKLY_SCORES[0], isLoading: false };
};

// 리그 순위 데이터
export const useLeagueRanking = (): { data: LeagueRankingData; isLoading: boolean } => {
  const [data, setData] = useState<LeagueRankingData>(DEFAULT_LEAGUE_RANKING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getLeagueStatus();
        if (result) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch league ranking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading };
};

// 전체 리그 규칙 데이터 (Modal용)
export const useLeagueRules = (): { data: LeagueRulesMap | null; isLoading: boolean } => {
  const [data, setData] = useState<LeagueRulesMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getLeagueRules();
      if (result) setData(result);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return { data, isLoading };
};
