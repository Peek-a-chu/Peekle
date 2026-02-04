import { useState, useEffect } from 'react';
import {
  MOCK_LEAGUE_PROGRESS,
  MOCK_ACTIVITY_STREAK,
  MOCK_TIMELINE,
  MOCK_AI_RECOMMENDATIONS,
  LeagueProgressData,
  ActivityStreakData,
  TimelineItemData,
  AIRecommendationData,
} from '../mocks/dashboardMocks';
import { DEFAULT_LEAGUE_RANKING } from '@/domains/league/utils';
import { LeagueRankingData, WeeklyPointSummary } from '@/domains/league/types';
import {
  getLeagueStatus,
  getLeagueRules,
  LeagueRulesMap,
  getWeeklyPointSummary,
} from '@/api/leagueApi';

// 리그 변화 추이 데이터
export const useLeagueProgress = (options?: {
  skip?: boolean;
}): { data: LeagueProgressData[]; isLoading: boolean } => {
  const [data, setData] = useState<LeagueProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (options?.skip) {
      setIsLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const result = await import('@/api/leagueApi').then((m) => m.getLeagueProgress());
        setData(result);
      } catch (error) {
        console.error('Failed to fetch league progress:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, isLoading };
};

// 활동 스트릭 데이터
export const useActivityStreak = (
  nickname?: string,
): { data: ActivityStreakData[]; isLoading: boolean } => {
  const [data, setData] = useState<ActivityStreakData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endpoint = nickname ? `/api/users/${nickname}/streak` : '/api/users/me/streak';
        const response = await fetch(endpoint);
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setData(MOCK_ACTIVITY_STREAK); // Fallback if needed or empty
          }
        }
      } catch (e) {
        console.error('Failed to fetch streak data:', e);
        setData(MOCK_ACTIVITY_STREAK);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, isLoading };
};

// 학습 타임라인 데이터
export const useTimeline = (
  date: string,
  nickname?: string,
  options?: { skip?: boolean },
): { data: TimelineItemData[]; isLoading: boolean } => {
  const [data, setData] = useState<TimelineItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (options?.skip) {
        setIsLoading(false);
        return;
      }

      if (!date) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const endpoint = nickname
          ? `/api/users/${nickname}/timeline?date=${date}`
          : `/api/users/me/timeline?date=${date}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            // Backend DTO matches TimelineItemData structure roughly, but we need to ensure fields map correctly
            // DTO: problemId, title, tier, tierLevel, link, submittedAt
            // TimelineItemData: problemId, title, tier, tierLevel, link, sources, sourceType, ...
            // We need to map 'tier' string to BojTier type ('bronze' etc.)

            const mappedData: TimelineItemData[] = (json.data || []).map((item: any) => ({
              submissionId: item.submissionId,
              problemId: item.problemId,
              title: item.title,
              tier: item.tier ? item.tier.toLowerCase() : 'bronze',
              tierLevel: item.tierLevel,
              link: item.link,
              sources: [], // 백준 태그 제거 (사용자 요청)
              sourceType: item.sourceType ? item.sourceType.toLowerCase() : 'problem',
              tag: item.tag, // 백엔드에서 받은 태그 (null일 수 있음)
              language: item.language,
              memory: item.memory,
              executionTime: item.executionTime,
              result: item.result, // 제출 결과
              isSuccess: item.isSuccess, // 성공 여부 매핑
              submittedAt: item.submittedAt,
            }));
            setData(mappedData);
          } else {
            setData([]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch timeline:', e);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [date]);

  return { data, isLoading };
};

// AI 추천 문제 데이터
export const useAIRecommendations = (options?: {
  skip?: boolean;
}): { data: AIRecommendationData[]; isLoading: boolean } => {
  // TODO: API 연동 시 fetch/useSWR로 변경
  return { data: MOCK_AI_RECOMMENDATIONS, isLoading: false };
};

// 주간 점수 데이터
export const useWeeklyScore = (
  date?: string,
  options?: { skip?: boolean },
): { data: WeeklyPointSummary | null; isLoading: boolean } => {
  const [data, setData] = useState<WeeklyPointSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getWeeklyPointSummary(date);
        if (result) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch weekly summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [date]);

  return { data, isLoading };
};

// 리그 순위 데이터
export const useLeagueRanking = (
  refreshInterval = 30000,
  options?: { skip?: boolean },
): { data: LeagueRankingData; isLoading: boolean } => {
  const [data, setData] = useState<LeagueRankingData>(DEFAULT_LEAGUE_RANKING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (options?.skip) {
      setIsLoading(false);
      return;
    }
    const fetchData = async (isPoll = false) => {
      try {
        const result = await getLeagueStatus();
        if (result) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch league ranking:', error);
      } finally {
        if (!isPoll) setIsLoading(false);
      }
    };

    fetchData(); // Initial fetch

    // Start polling
    const intervalId = setInterval(() => fetchData(true), refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

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
