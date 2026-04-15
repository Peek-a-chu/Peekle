import CSWrongReviewSession from '@/domains/cs/components/session/CSWrongReviewSession';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오답 복습 | CS 학습 - Peekle',
  description: '오답 문제를 다시 풀며 복습합니다.',
};

interface CSWrongReviewPageProps {
  searchParams: Promise<{ domainId?: string; stageId?: string; year?: string; round?: string }>;
}

export default async function CSWrongReviewPage({ searchParams }: CSWrongReviewPageProps) {
  const { domainId: rawDomainId, stageId: rawStageId, year: rawYear, round: rawRound } = await searchParams;
  const parsedDomainId = rawDomainId ? Number(rawDomainId) : NaN;
  const parsedStageId = rawStageId ? Number(rawStageId) : NaN;
  const parsedYear = rawYear ? Number(rawYear) : NaN;
  const parsedRound = rawRound ? Number(rawRound) : NaN;
  const domainId = Number.isFinite(parsedDomainId) ? parsedDomainId : null;
  const stageId = Number.isFinite(parsedStageId) ? parsedStageId : null;
  const year = Number.isFinite(parsedYear) ? parsedYear : null;
  const round = Number.isFinite(parsedRound) ? parsedRound : null;

  return <CSWrongReviewSession domainId={domainId} stageId={stageId} year={year} round={round} />;
}
