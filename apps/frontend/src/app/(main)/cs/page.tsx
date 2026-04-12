'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { fetchCSBootstrap, CSBootstrapResponse } from '@/domains/cs/api/csApi';
import DomainSelection from '@/domains/cs/components/DomainSelection';
import LearningMap from '@/domains/cs/components/LearningMap';
import CSTopBar from '@/domains/cs/components/CSTopBar';
import { toast } from 'sonner';

export default function CSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootstrapData, setBootstrapData] = useState<CSBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const forceSelection = searchParams.get('mode') === 'add';

  const setAddMode = (isAddMode: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (isAddMode) params.set('mode', 'add');
    else params.delete('mode');
    const query = params.toString();
    router.replace(query ? `/cs?${query}` : '/cs', { scroll: false });
  };

  const loadBootstrap = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] CSPage: fetchCSBootstrap 호출');
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

  // API spec #141: needsDomainSelection이 true거나 currentDomain이 없으면 선택 화면
  const needsSelection = forceSelection || (bootstrapData?.needsDomainSelection ?? !bootstrapData?.currentDomain);

  if (needsSelection) {
    return (
      <DomainSelection
        isAddMode={forceSelection}
        onCancel={() => {
          console.log('[DEBUG] CSPage: 도메인 추가 취소 → 맵 화면 복귀');
          setAddMode(false);
        }}
        onSuccess={() => {
          console.log('[DEBUG] CSPage: DomainSelection 완료 → bootstrap 재로드');
          setAddMode(false);
          loadBootstrap();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      {bootstrapData?.currentDomain && (
        <CSTopBar
          currentDomain={bootstrapData.currentDomain}
          onDomainChanged={() => {
            console.log('[DEBUG] CSPage: 도메인 변경 완료 → bootstrap 재로드');
            loadBootstrap();
          }}
          onRequestAddDomain={() => {
            console.log('[DEBUG] CSPage: 도메인 추가 요청 → DomainSelection 표시');
            setAddMode(true);
          }}
          onRequestWrongNote={() => {
            console.log('[DEBUG] CSPage: 오답 보기 요청 → 오답노트 페이지 이동');
            router.push('/cs/wrong-problems');
          }}
        />
      )}

      <div className="bg-card rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">CS 학습</h1>

        <p className="text-muted-foreground mb-6">
          선택한 도메인: <span className="font-semibold text-primary">{bootstrapData?.currentDomain?.name}</span>
        </p>
        {bootstrapData?.progress ? (
          <div className="w-full flex flex-col items-center">
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
