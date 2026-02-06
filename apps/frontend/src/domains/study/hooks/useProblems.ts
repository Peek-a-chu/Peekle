import { useState, useCallback, useEffect, useRef } from 'react';
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

export function useProblems(studyId: number, dateString?: string) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimersRef = useRef<number[]>([]);

  const fetchProblems = useCallback(async () => {
    if (!studyId) return;
    setIsLoading(true);
    try {
      const targetDate = dateString || new Date().toISOString().split('T')[0];
      const res = await apiFetch<any[]>(
        `/api/studies/${studyId}/curriculum/daily?date=${targetDate}`,
      );
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
  }, [studyId, dateString]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Listen for problem add/remove events from websocket
  useEffect(() => {
    const handleProblemAdded = (event: CustomEvent) => {
      const { studyId: eventStudyId, problem } = event.detail;
      if (eventStudyId === studyId && problem) {
        console.log('[useProblems] Problem added, updating state:', problem);
        const newProblemId = Number(problem.problemId || problem.id);

        // Optimistically add the problem if it's not already there
        setProblems((prev) => {
          // Check if problem already exists
          if (prev.some((p) => Number(p.problemId) === newProblemId)) {
            console.log('[useProblems] Problem already exists, skipping optimistic add');
            return prev;
          }
          // Add the new problem with default values
          return [
            ...prev,
            {
              id: newProblemId,
              problemId: newProblemId,
              externalId: problem.externalId || String(problem.number),
              title: problem.title || `문제 ${newProblemId}`,
              tier: problem.tier || 'Unrated',
              number: problem.externalId ? parseInt(problem.externalId, 10) : newProblemId,
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
        // fetchProblems(); // Disabled to prevent overwriting optimistic update with stale data
      }
    };

    const handleProblemRemoved = (event: CustomEvent) => {
      const { studyId: eventStudyId, problemId } = event.detail;
      if (eventStudyId === studyId && problemId) {
        console.log('[useProblems] Problem removed, refetching:', problemId);
        // Remove from local state immediately for better UX
        setProblems((prev) =>
          prev.filter(
            (p) => Number(p.problemId) !== Number(problemId) && Number(p.id) !== Number(problemId),
          ),
        );
        // Then refetch to ensure consistency
        // fetchProblems(); // Disabled to prevent overwriting optimistic update with stale data
      }
    };

    const handleCurriculumUpdated = (event: CustomEvent) => {
      const { studyId: eventStudyId } = event.detail;
      if (eventStudyId === studyId) {
        console.log('[useProblems] Curriculum updated, refetching');
        fetchProblems();
      }
    };

    const handleProblemSubmitted = (event: CustomEvent) => {
      const { studyId: eventStudyId } = event.detail;
      if (eventStudyId !== studyId) return;

      // Clear any pending refreshes to avoid piling up
      refreshTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      refreshTimersRef.current = [];

      // Submission results can be delayed on the backend; retry a few times.
      const delays = [1200, 3500, 8000];
      delays.forEach((delay) => {
        const timerId = window.setTimeout(() => {
          fetchProblems();
        }, delay);
        refreshTimersRef.current.push(timerId);
      });
    };

    window.addEventListener('study-problem-added', handleProblemAdded as EventListener);
    window.addEventListener('study-problem-removed', handleProblemRemoved as EventListener);
    window.addEventListener('study-curriculum-updated', handleCurriculumUpdated as EventListener);
    window.addEventListener('study-problem-submitted', handleProblemSubmitted as EventListener);

    return () => {
      window.removeEventListener('study-problem-added', handleProblemAdded as EventListener);
      window.removeEventListener('study-problem-removed', handleProblemRemoved as EventListener);
      window.removeEventListener(
        'study-curriculum-updated',
        handleCurriculumUpdated as EventListener,
      );
      window.removeEventListener(
        'study-problem-submitted',
        handleProblemSubmitted as EventListener,
      );
      refreshTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      refreshTimersRef.current = [];
    };
  }, [studyId, fetchProblems]);

  const { addProblem: socketAddProblem, removeProblem: socketRemoveProblem } =
    useStudySocketActions();

  const addProblem = useCallback(
    async (title: string, number: number, tags?: string[], problemId?: number, date?: string) => {
      try {
        let actualProblemId = problemId;

        // problemId가 제공되지 않으면 externalId로 조회
        if (!actualProblemId) {
          // number is externalId (BOJ problem number), convert to problemId
          actualProblemId = await getProblemIdByExternalId(String(number), 'BOJ');
        }

        if (actualProblemId) {
          socketAddProblem(actualProblemId, date);
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
