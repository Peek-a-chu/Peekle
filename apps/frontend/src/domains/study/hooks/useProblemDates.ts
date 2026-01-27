import { useState, useCallback, useEffect } from 'react';

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
    // API removed from spec
    // Do nothing or return empty. UI using this might not show dots, which is acceptable per "ONLY spec" req.
    setHistoryDates([]);
  }, []);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  return { historyDates, isLoading, error, refresh: loadDates };
}
