'use client';

import { useEffect, useState } from 'react';

import { getUnviewedLeagueHistory, type LeagueHistoryResponse } from '@/api/leagueApi';

export function useLeagueResultModalHost() {
  const [history, setHistory] = useState<LeagueHistoryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkHistory = async (): Promise<void> => {
      try {
        const data = await getUnviewedLeagueHistory();
        if (isMounted && data) {
          setHistory(data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void checkHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    history,
    clearHistory: () => setHistory(null),
  };
}
