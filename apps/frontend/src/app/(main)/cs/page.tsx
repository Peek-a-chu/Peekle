'use client';

import { useEffect, useState } from 'react';
import { Loader2, BookX } from 'lucide-react';
import { fetchCSBootstrap, CSBootstrapResponse } from '@/domains/cs/api/csApi';
import DomainSelection from '@/domains/cs/components/DomainSelection';
import LearningMap from '@/domains/cs/components/LearningMap';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CSPage() {
  const [bootstrapData, setBootstrapData] = useState<CSBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBootstrap = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] Fetching CS Bootstrap data...');
      const data = await fetchCSBootstrap();
      setBootstrapData(data);
    } catch (error) {
      toast.error('CS 정보를 불러오지 못했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">CS 학습 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // API spec #141 says needsDomainSelection, or currentDomain will be null.
  const needsSelection = bootstrapData?.needsDomainSelection ?? !bootstrapData?.currentDomain;

  if (needsSelection) {
    return <DomainSelection onSuccess={loadBootstrap} />;
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="bg-card rounded-2xl p-8 shadow-sm">
        {/* ── 헤더 영역 ── */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold">CS 학습</h1>
          <Link
            href="/cs/wrong-notes"
            id="cs-wrong-notes-btn"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group shrink-0"
          >
            <BookX className="w-4 h-4 group-hover:text-primary transition-colors" />
            오답노트
          </Link>
        </div>

        <p className="text-muted-foreground mb-6">
          선택한 도메인: <span className="font-semibold text-primary">{bootstrapData?.currentDomain?.name}</span>
        </p>
        {bootstrapData?.progress ? (
          <div className="mt-4 pt-4 w-full flex flex-col items-center">
            <LearningMap progress={bootstrapData.progress} stages={bootstrapData.stages ?? []} />
          </div>
        ) : (
          <div className="p-8 border border-dashed border-primary/30 rounded-xl bg-primary/5 text-center">
            <p className="text-lg font-medium text-foreground mb-2">진행도 정보를 불러올 수 없습니다. 🚨</p>
          </div>
        )}
      </div>
    </div>
  );
}
