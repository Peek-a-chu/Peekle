import CSWrongNoteList from '@/domains/cs/components/CSWrongNoteList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '오답노트 | CS 학습 - Peekle',
  description: '틀린 CS 문제를 모아 복습하고 약점을 보완하세요.',
};

interface CSWrongProblemsPageProps {
  searchParams: Promise<{
    domainId?: string;
    stageId?: string;
    year?: string;
    round?: string;
  }>;
}

export default async function CSWrongProblemsPage({ searchParams }: CSWrongProblemsPageProps) {
  const params = await searchParams;
  const parsedDomainId = params.domainId ? Number(params.domainId) : NaN;
  const parsedStageId = params.stageId ? Number(params.stageId) : NaN;
  const parsedYear = params.year ? Number(params.year) : NaN;
  const parsedRound = params.round ? Number(params.round) : NaN;

  const domainId = Number.isFinite(parsedDomainId) ? parsedDomainId : null;
  const stageId = Number.isFinite(parsedStageId) ? parsedStageId : null;
  const year = Number.isFinite(parsedYear) ? parsedYear : null;
  const round = Number.isFinite(parsedRound) ? parsedRound : null;

  return (
    <div className="flex flex-col min-h-[80vh] animate-in fade-in duration-300">
      <header className="flex items-center gap-3 py-4 pb-6">
        <Link
          href="/cs"
          id="wrong-problems-back-btn"
          className="p-2 rounded-xl hover:bg-muted transition-colors group"
          aria-label="CS 학습으로 돌아가기"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">오답노트</h1>
          <p className="text-sm text-muted-foreground">틀린 문제를 모아 복습하세요</p>
        </div>
      </header>

      <CSWrongNoteList
        initialDomainId={domainId}
        initialStageId={stageId}
        initialYear={year}
        initialRound={round}
      />
    </div>
  );
}
