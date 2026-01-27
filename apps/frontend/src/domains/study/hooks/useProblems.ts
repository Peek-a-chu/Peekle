import { useState, useEffect, useCallback } from 'react';
import { DailyProblem } from '../types';
import { fetchProblems } from '@/api/problemApi';
import { format } from 'date-fns';
import { useSocket } from './useSocket';
import { useRoomStore } from './useRoomStore';
import { Client } from '@stomp/stompjs';

interface UseProblemsResult {
  problems: DailyProblem[];
  isLoading: boolean;
  error: Error | null;
  addProblem: (title: string, number: number, tags?: string[]) => Promise<void>;
  removeProblem: (problemId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProblems(studyId: number, date: Date): UseProblemsResult {
  const [problems, setProblems] = useState<DailyProblem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const currentUserId = useRoomStore((state) => state.currentUserId);
  const socket = useSocket(studyId, currentUserId);

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

  // [Realtime] Listen for problem updates
  useEffect(() => {
    if (!socket || !socket.connected) return;
    
    // Subscribe to curriculum topic: /topic/studies/rooms/{id}/problems
    const sub = socket.subscribe(`/topic/studies/rooms/${studyId}/problems`, (message) => {
         try {
             // Spec: { type: "CURRICULUM", data: { problemId: 1000, title: "A+B" } }
             // Or { type: "REFRESH" } if we keep old compat
             // Assuming we just reload for now as safest update
             void loadProblems();
         } catch(e) {}
    });

    return () => {
        sub.unsubscribe();
    };
  }, [socket, studyId, loadProblems]);

  // STOMP Action for Add
  const addProblem = useCallback(async (title: string, number: number, tags?: string[]) => {
      // Use socket if connected
      if (socket && socket.connected) {
          socket.publish({
              destination: '/pub/studies/problems',
              body: JSON.stringify({ studyId, action: "ADD", problemId: number })
          });
      }
  }, [socket, studyId]);

  // STOMP Action for Remove - Spec doesn't detail remove?
  // "문제 추가 PUB /pub/studies/problems" is there.
  // Maybe remove is done via same endpoint with Action REMOVE?
  // Assuming for now we just log warning or do nothing if spec lacks it.
  const removeProblem = useCallback(async (problemId: number) => {
      console.warn("Remove problem not explicitly in spec. Skipping.");
  }, []);

  return { 
     problems, 
     isLoading, 
     error, 
     addProblem, 
     removeProblem, 
     refresh: loadProblems 
  };
}
