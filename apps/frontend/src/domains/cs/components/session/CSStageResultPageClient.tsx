'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { CSAttemptCompleteResponse } from '@/domains/cs/api/csApi';
import { getCSStageResultStorageKey } from '@/domains/cs/utils/stageResultStorage';
import CSResultScreen from './CSResultScreen';

interface CSStageResultPageClientProps {
  stageId: number;
}

export default function CSStageResultPageClient({ stageId }: CSStageResultPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPastExam = searchParams.get('source') === 'past-exam';
  const returnPath = isPastExam ? '/cs/past-exams' : '/cs';
  const [result, setResult] = useState<CSAttemptCompleteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = getCSStageResultStorageKey(stageId);
    const raw = sessionStorage.getItem(key);

    if (!raw) {
      router.replace(returnPath);
      return;
    }

    sessionStorage.removeItem(key);

    try {
      const parsed = JSON.parse(raw) as CSAttemptCompleteResponse;
      setResult(parsed);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to parse CS stage result:', error);
      router.replace(returnPath);
    }
  }, [returnPath, router, stageId]);

  if (isLoading || !result) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium text-muted-foreground">결과 화면을 준비하고 있습니다...</p>
      </div>
    );
  }

  return <CSResultScreen result={result} isPastExam={isPastExam} returnPath={returnPath} />;
}
