import { useState, useCallback } from 'react';
import { Submission } from '../types';
import { fetchSubmissions } from '@/api/problemApi';

interface UseSubmissionsResult {
  submissions: Submission[];
  isLoading: boolean;
  error: Error | null;
  loadSubmissions: (problemId: number) => Promise<void>;
}

export function useSubmissions(studyId: number): UseSubmissionsResult {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSubmissions = useCallback(
    async (problemId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSubmissions(studyId, problemId);
        setSubmissions(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [studyId],
  );

  return { submissions, isLoading, error, loadSubmissions };
}
