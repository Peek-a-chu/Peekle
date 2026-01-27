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
      console.log(`[useProblems] Fetching problems for ${dateStr}`);
      const data = await fetchProblems(studyId, dateStr);
      console.log(`[useProblems] Fetched problems: ${data.length}`, data);
      
      // Merge with existing problems if they were added via socket but not yet in DB?
      // For now, trust the API as source of truth for "official" list.
      // But if we just added one, and API is stale, we might lose it.
      // Optimistic merging is tricky without timestamps.
      // Let's rely on setProblems(data) and hope 1000ms delay was enough.
      
      setProblems(data);
    } catch (err) {
      console.error('[useProblems] Failed to fetch problems:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [studyId, date]);

  useEffect(() => {
    // Initial fetch
    void loadProblems();
  }, [loadProblems]);

  // [Realtime] Listen for problem updates
  useEffect(() => {
    // Quietly return if socket is not ready yet
    if (!socket || !socket.connected) {
      return;
    }
    
    console.log(`[useProblems] Subscribing to problems topic: /topic/studies/rooms/${studyId}/problems`);
    // Subscribe to curriculum topic: /topic/studies/rooms/{id}/problems
    const sub = socket.subscribe(`/topic/studies/rooms/${studyId}/problems`, (message) => {
         try {
             console.log('[useProblems] Raw message received:', message.body);
             const body = JSON.parse(message.body);
             console.log('[useProblems] Parsed body:', body);
             
             if (body.type === 'CURRICULUM' && body.data) {
                 const { action, problemId, title } = body.data;
                 console.log(`[useProblems] Action: ${action}, ProblemId: ${problemId}`);

                 if (action === 'ADD' && problemId) {
                     const pid = Number(problemId);
                     console.warn(`[useProblems] Processing ADD for problem ${pid}`);
                     
                     setProblems(prev => {
                         if (prev.some(p => p.problemId === pid)) {
                             console.warn('[useProblems] Problem already exists in state:', pid);
                             return prev;
                         }
                         const newProblem: DailyProblem = {
                             problemId: pid,
                             title: title || `Problem ${pid}`,
                             tier: 'Unrated',
                             solvedMemberCount: 0
                         };
                         const newProblems = [...prev, newProblem];
                         console.warn('[useProblems] Updated problems state:', newProblems);
                         return newProblems;
                     });

                     // Fallback refresh to ensure sync with DB - Increased delay to 1000ms
                     setTimeout(() => {
                        console.log('[useProblems] Executing fallback refresh');
                        void loadProblems();
                     }, 1000);
                 } else if (action === 'REMOVE' && problemId) {
                     const pid = Number(problemId);
                     setProblems(prev => prev.filter(p => p.problemId !== pid));
                 }
             }
         } catch(e) {
            console.error('[useProblems] Error parsing message:', e);
         }
    });

    return () => {
        console.log('[useProblems] Unsubscribing from problems topic');
        sub.unsubscribe();
    };
  }, [socket, studyId]); // loadProblems intentionally omitted to clean dependencies

  // STOMP Action for Add
  const addProblem = useCallback(async (title: string, number: number, tags?: string[]) => {
      if (!socket) {
        console.error('Socket instance is null');
        throw new Error('소켓 연결이 되어있지 않습니다.');
      }
      if (!socket.connected) {
        throw new Error('서버와 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
      }

      console.log(`[useProblems] Sending ADD request for Problem ${number}`);
      
      // [Optimistic Update] Add to UI immediately
      setProblems(prev => {
          if (prev.some(p => p.problemId === number)) return prev;
          const newProblem: DailyProblem = {
              problemId: number,
              title: title,
              tier: 'Unrated',
              solvedMemberCount: 0
          };
          return [...prev, newProblem];
      });

      socket.publish({
          destination: '/pub/studies/problems',
          body: JSON.stringify({ studyId, action: "ADD", problemId: number })
      });
      // Optionally trigger local refresh immediately?
      // void loadProblems(); 
  }, [socket, studyId]);

  // STOMP Action for Remove
  const removeProblem = useCallback(async (problemId: number) => {
      if (!socket || !socket.connected) {
          throw new Error('서버와 연결되지 않았습니다.');
      }
      console.log(`[useProblems] Sending REMOVE request for Problem ${problemId}`);
      socket.publish({
          destination: '/pub/studies/problems',
          body: JSON.stringify({ studyId, action: "REMOVE", problemId })
      });
  }, [socket, studyId]);

  return { 
     problems, 
     isLoading, 
     error, 
     addProblem, 
     removeProblem, 
     refresh: loadProblems 
  };
}
