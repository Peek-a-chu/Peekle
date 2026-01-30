import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';

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
      const res = await apiFetch<any[]>(`/api/studies/${studyId}/curriculum/daily?date=${date}`);
      if (res.success && res.data) {
        setProblems(
          res.data.map((p) => ({
            ...p,
            problemId: p.problemId || p.id, // Use problemId from API if available, fallback to id
            solvedMemberCount: p.participantCount ?? 0,
            tier: String(p.tier),
          })),
        );
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

  const { addProblem: socketAddProblem, removeProblem: socketRemoveProblem } =
    useStudySocketActions();

  const addProblem = useCallback(
    async (title: string, number: number, tags?: string[]) => {
      try {
        // Spec requires problemId. We assume 'number' is problemId for BOJ?
        // Or do we need to search first?
        // The Add payload is { action: 'ADD', problemId: 1000 }
        // The UI seems to pass 'number' as the ID.
        if (number) socketAddProblem(number);
        // fetchProblems(); // Socket will trigger update eventually?
        // For now, let's just trigger socket.
      } catch (error) {
        console.error('Failed to add problem:', error);
      }
    },
    [socketAddProblem],
  );

  const deleteProblem = useCallback(
    async (problemId: number) => {
      try {
        socketRemoveProblem(problemId);
      } catch (error) {
        console.error('Failed to delete problem:', error);
      }
    },
    [socketRemoveProblem],
  );

  return { problems, isLoading, addProblem, deleteProblem, refetch: fetchProblems };
}
