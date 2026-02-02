import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { getProblemIdByExternalId } from '@/domains/study/api/problemApi';

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
  totalMemberCount: number;
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
            externalId: p.externalId, // Preserve externalId for display
            solvedMemberCount: p.solvedMemberCount ?? 0, // Use solvedMemberCount from API
            totalMemberCount: p.totalMemberCount ?? 0, // Use totalMemberCount from API
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

  // Listen for problem add/remove events from websocket
  useEffect(() => {
    const handleProblemAdded = (event: CustomEvent) => {
      const { studyId: eventStudyId, problem } = event.detail;
      if (eventStudyId === studyId && problem) {
        console.log('[useProblems] Problem added, updating state:', problem);
        // Optimistically add the problem if it's not already there
        setProblems((prev) => {
          // Check if problem already exists
          if (prev.some((p) => p.problemId === problem.problemId)) {
            console.log('[useProblems] Problem already exists, skipping optimistic add');
            return prev;
          }
          // Add the new problem with default values
          return [
            ...prev,
            {
              id: problem.problemId,
              problemId: problem.problemId,
              externalId: problem.externalId,
              title: problem.title || 'Unknown',
              tier: problem.tier || 'Unrated',
              number: problem.externalId ? parseInt(problem.externalId, 10) : problem.problemId,
              tags: [],
              status: 'not_started' as const,
              participantCount: 0,
              totalParticipants: problem.totalMemberCount || 0,
              url: problem.externalId
                ? `https://www.acmicpc.net/problem/${problem.externalId}`
                : '',
              solvedMemberCount: problem.solvedMemberCount || 0,
              totalMemberCount: problem.totalMemberCount || 0,
            },
          ];
        });
        // Then refetch to ensure consistency and get all details
        fetchProblems();
      }
    };

    const handleProblemRemoved = (event: CustomEvent) => {
      const { studyId: eventStudyId, problemId } = event.detail;
      if (eventStudyId === studyId && problemId) {
        console.log('[useProblems] Problem removed, refetching:', problemId);
        // Remove from local state immediately for better UX
        setProblems((prev) => prev.filter((p) => p.problemId !== problemId && p.id !== problemId));
        // Then refetch to ensure consistency
        fetchProblems();
      }
    };

    const handleCurriculumUpdated = (event: CustomEvent) => {
      const { studyId: eventStudyId } = event.detail;
      if (eventStudyId === studyId) {
        console.log('[useProblems] Curriculum updated, refetching');
        fetchProblems();
      }
    };

    window.addEventListener('study-problem-added', handleProblemAdded as EventListener);
    window.addEventListener('study-problem-removed', handleProblemRemoved as EventListener);
    window.addEventListener('study-curriculum-updated', handleCurriculumUpdated as EventListener);

    return () => {
      window.removeEventListener('study-problem-added', handleProblemAdded as EventListener);
      window.removeEventListener('study-problem-removed', handleProblemRemoved as EventListener);
      window.removeEventListener('study-curriculum-updated', handleCurriculumUpdated as EventListener);
    };
  }, [studyId, fetchProblems]);

  const { addProblem: socketAddProblem, removeProblem: socketRemoveProblem } =
    useStudySocketActions();

  const addProblem = useCallback(
    async (title: string, number: number, tags?: string[], problemId?: number) => {
      try {
        let actualProblemId = problemId;
        
        // problemId가 제공되지 않으면 externalId로 조회
        if (!actualProblemId) {
          // number is externalId (BOJ problem number), convert to problemId
          actualProblemId = await getProblemIdByExternalId(String(number), 'BOJ');
        }
        
        if (actualProblemId) {
          socketAddProblem(actualProblemId);
        } else {
          throw new Error('Failed to find problem ID');
        }
      } catch (error) {
        console.error('Failed to add problem:', error);
        throw error; // Re-throw to let caller handle the error
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
