import { useState, useEffect, useCallback } from 'react';
import { fetchProblemDates } from '@/domains/study/api/problemApi';

interface UseProblemDatesResult {
  historyDates: Date[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProblemDates(studyId: number): UseProblemDatesResult {
  const [historyDates, setHistoryDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dates = await fetchProblemDates(studyId);
      // Convert 'YYYY-MM-DD' strings to Date objects
      const parsedDates = dates.map(dateStr => new Date(dateStr));
      setHistoryDates(parsedDates);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  return { historyDates, isLoading, error, refresh: loadDates };
}
