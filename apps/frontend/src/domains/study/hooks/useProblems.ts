import { useState, useEffect, useCallback } from 'react';
import { Problem } from '../types';
import { fetchProblems } from '@/app/api/problemApi';
import { addProblemAction, deleteProblemAction } from '../actions/problemActions';
import { format } from 'date-fns';

interface UseProblemsResult {
  problems: Problem[];
  isLoading: boolean;
  error: Error | null;
  addProblem: (title: string, number: number, tags?: string[]) => Promise<void>;
  removeProblem: (problemId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProblems(studyId: number, date: Date): UseProblemsResult {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadProblems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const data = await fetchProblems(studyId, dateStr);
      setProblems(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [studyId, date]);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  const addProblem = async (title: string, number: number, tags?: string[]): Promise<void> => {
    // Calling Server Action from Client Component
    await addProblemAction(studyId, { title, number, tags });
    await loadProblems(); // Refresh the list
  };

  const removeProblem = async (problemId: number): Promise<void> => {
    await deleteProblemAction(studyId, problemId);
    await loadProblems();
  };

  return { problems, isLoading, error, addProblem, removeProblem, refresh: loadProblems };
}
