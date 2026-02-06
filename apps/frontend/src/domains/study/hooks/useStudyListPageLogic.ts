'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyStudies } from '@/domains/study/api/studyApi';
import type { StudyListContent } from '@/domains/study/types';

export function useStudyListPageLogic() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [studies, setStudies] = useState<StudyListContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch study list from API
  const fetchStudies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyStudies(0, searchQuery);
      // 디버깅: 실제 응답 데이터 확인
      if (process.env.NODE_ENV === 'development') {
        console.log('[useStudyListPageLogic] Fetched studies:', data);
        if (data.content && data.content.length > 0) {
          console.log(
            '[useStudyListPageLogic] First study:',
            JSON.stringify(data.content[0], null, 2),
          );
          console.log(
            '[useStudyListPageLogic] First study rankingPoint:',
            data.content[0].rankingPoint,
          );
          console.log('[useStudyListPageLogic] First study owner:', data.content[0].owner);
        }
      }
      setStudies(data.content || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch studies'));
      setStudies([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void fetchStudies();
  }, [fetchStudies]);

  // Client-side filtering (additional to server-side keyword search)
  const filteredStudies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return studies;
    return studies.filter((study) => study.title.toLowerCase().includes(query));
  }, [studies, searchQuery]);

  const handleStudyClick = (studyId: number) => {
    router.push(`/study/${studyId}`);
  };

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false);
    // Refetch to get the newly created study
    setIsLoading(true);
    try {
      const data = await fetchMyStudies(0, '');
      if (data.content && data.content.length > 0) {
        // Navigate to the first study (newest, sorted by createdAt desc)
        const newestStudy = data.content[0];
        setStudies(data.content);
        router.push(`/study/${newestStudy.id}`);
      } else {
        setStudies([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch studies'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSuccess = async (studyId: number) => {
    setJoinModalOpen(false);
    await fetchStudies();
    router.push(`/study/${studyId}`);
  };

  return {
    studies: filteredStudies,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    joinModalOpen,
    setJoinModalOpen,
    createModalOpen,
    setCreateModalOpen,
    handleStudyClick,
    handleCreateSuccess,
    handleJoinSuccess,
    refetch: fetchStudies,
  };
}
