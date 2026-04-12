import CSWrongReviewSession from '@/domains/cs/components/session/CSWrongReviewSession';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오답 복습 | CS 학습 - Peekle',
  description: '오답 문제를 다시 풀며 복습합니다.',
};

interface CSWrongReviewPageProps {
  searchParams: Promise<{ domainId?: string }>;
}

export default async function CSWrongReviewPage({ searchParams }: CSWrongReviewPageProps) {
  const { domainId: rawDomainId } = await searchParams;
  const parsedDomainId = rawDomainId ? Number(rawDomainId) : NaN;
  const domainId = Number.isFinite(parsedDomainId) ? parsedDomainId : null;

  return <CSWrongReviewSession domainId={domainId} />;
}
