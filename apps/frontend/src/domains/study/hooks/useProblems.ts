import { useState, useCallback, useEffect } from 'react';
import { addProblemAction, deleteProblemAction } from '@/domains/study/actions/problemActions';
import { apiFetch } from '@/lib/api';

export interface Problem {
  id: number;
  title: string;
  number: number;
  tier: string;
  tags: string[];
  status: 'success' | 'fail' | 'not_started';
  participantCount: number;
  totalParticipants: number;
  url: string;
  problemId: number;
  solvedMemberCount: number;
}

export function useProblems(studyId: number) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProblems = useCallback(async () => {
    if (!studyId) return;
    setIsLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const res = await apiFetch<any[]>(
        `/api/studies/${studyId}/curriculum/daily?date=${date}`,
      );
      if (res.success && res.data) {
        setProblems(res.data.map((p) => ({
          ...p,
          problemId: p.id,
          solvedMemberCount: p.participantCount ?? 0,
          tier: String(p.tier),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const addProblem = useCallback(
    async (title: string, number: number, tags?: string[]) => {
      try {
        await addProblemAction(studyId, { title, number, tags });
        fetchProblems();
      } catch (error) {
        console.error('Failed to add problem:', error);
      }
    },
    [studyId, fetchProblems],
  );

  const deleteProblem = useCallback(
    async (problemId: number) => {
      try {
        await deleteProblemAction(studyId, problemId);
        fetchProblems();
      } catch (error) {
        console.error('Failed to delete problem:', error);
      }
    },
    [studyId, fetchProblems],
  );

  return { problems, isLoading, addProblem, deleteProblem, refetch: fetchProblems };
}
