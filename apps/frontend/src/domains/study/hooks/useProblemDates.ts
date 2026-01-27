import { useState, useCallback, useEffect } from 'react';

interface UseProblemDatesResult {
  historyDates: Date[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProblemDates(_studyId: number): UseProblemDatesResult {
  const [historyDates, setHistoryDates] = useState<Date[]>([]);

  const loadDates = useCallback(async () => {
    // API removed from spec
    // Do nothing or return empty. UI using this might not show dots, which is acceptable per "ONLY spec" req.
    await Promise.resolve();
    setHistoryDates([]);
  }, []);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  return { historyDates, isLoading: false, error: null, refresh: loadDates };
}
