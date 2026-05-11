'use client';

import dynamic from 'next/dynamic';

import { useLeagueResultModalHost } from '@/domains/league/hooks/useLeagueResultModalHost';

const LeagueResultModal = dynamic(() => import('@/domains/league/components/LeagueResultModal'), {
  ssr: false,
  loading: () => null,
});

export function LeagueResultModalHost() {
  const { history, clearHistory } = useLeagueResultModalHost();

  if (!history) return null;

  return <LeagueResultModal initialHistory={history} onDone={clearHistory} />;
}
