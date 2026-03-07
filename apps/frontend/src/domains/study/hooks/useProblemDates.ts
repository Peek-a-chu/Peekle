import { useState, useCallback, useEffect, useRef } from 'react';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { apiFetch } from '@/lib/api';

interface UseProblemDatesResult {
  historyDates: Date[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProblemDates(studyId: number, baseDate: Date = new Date()): UseProblemDatesResult {
  const [historyDates, setHistoryDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, Date[]>>(new Map());

  const monthKey = format(baseDate, 'yyyy-MM');

  const loadDates = useCallback(async (forceRefresh = false) => {
    if (!studyId) {
      setHistoryDates([]);
      return;
    }

    const cacheKey = `${studyId}-${monthKey}`;
    if (!forceRefresh) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setHistoryDates(cached);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const monthStart = startOfMonth(baseDate);
      const monthEnd = endOfMonth(baseDate);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const results = await Promise.allSettled(
        daysInMonth.map(async (day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const response = await apiFetch<any[]>(
            `/api/studies/${studyId}/curriculum/daily?date=${dateKey}&_t=${Date.now()}`,
          );
          if (response.success && Array.isArray(response.data) && response.data.length > 0) {
            return day;
          }
          return null;
        }),
      );

      const nextHistoryDates = results.reduce<Date[]>((acc, result) => {
        if (result.status === 'fulfilled' && result.value instanceof Date) {
          acc.push(result.value);
        }
        return acc;
      }, []);

      cacheRef.current.set(cacheKey, nextHistoryDates);
      setHistoryDates(nextHistoryDates);
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to load problem dates');
      setError(nextError);
      setHistoryDates([]);
    } finally {
      setIsLoading(false);
    }
  }, [studyId, monthKey, baseDate]);

  useEffect(() => {
    void loadDates(false);
  }, [loadDates]);

  const refresh = useCallback(async () => {
    await loadDates(true);
  }, [loadDates]);

  return { historyDates, isLoading, error, refresh };
}
