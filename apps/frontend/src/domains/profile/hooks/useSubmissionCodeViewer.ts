'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { SubmissionHistory } from '../types';

export function useSubmissionCodeViewer(initialHistory: SubmissionHistory[]) {
  const searchParams = useSearchParams();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionHistory | null>(null);

  useEffect(() => {
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      setSelectedSubmission(null);
      return;
    }

    const target = initialHistory.find((history) => String(history.id) === submissionId);

    setSelectedSubmission(target ?? null);
  }, [initialHistory, searchParams]);

  const selectSubmission = useCallback((item: SubmissionHistory) => {
    setSelectedSubmission(item);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('submissionId', String(item.id));
    window.history.pushState({}, '', newUrl.toString());
  }, []);

  const closeSubmission = useCallback(() => {
    setSelectedSubmission(null);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('submissionId');
    window.history.pushState({}, '', newUrl.toString());
  }, []);

  return {
    selectedSubmission,
    selectSubmission,
    closeSubmission,
  };
}
