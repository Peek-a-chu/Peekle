'use client';

import { useState, useEffect } from 'react';
import { getRankings, type RankResponse } from '@/api/rankingApi';
import { TopThreePodium } from './TopThreePodium';
import { StudyRankingList } from './StudyRankingList';
import { RankingPagination } from './RankingPagination';
import { Card, CardContent } from '@/components/ui/card';

export function CCStudyRankingBoard(): React.ReactNode {
  const [rankings, setRankings] = useState<RankResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [scope, setScope] = useState<'ALL' | 'MINE'>('ALL');
  const [topThreeRankings, setTopThreeRankings] = useState<RankResponse[]>([]);

  const pageSize = 10;

  // Fetch top 3 rankings once on mount and persist them
  useEffect(() => {
    const fetchTopThree = async () => {
      try {
        const data = await getRankings(0, 3, undefined, 'ALL');
        setTopThreeRankings(data.content);
      } catch (error) {
        console.error('Failed to fetch top rankings:', error);
        setTopThreeRankings([]);
      }
    };
    void fetchTopThree();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    const fetchRankings = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getRankings(currentPage, pageSize, undefined, scope);
        setRankings(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rankings');
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRankings();
  }, [currentPage, scope]);

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScopeChange = (newScope: 'ALL' | 'MINE'): void => {
    if (scope === newScope) return;
    setScope(newScope);
    setCurrentPage(0);
  };

  const handleStudyClick = (studyId: number): void => {
    // TODO: S8-2에서 상세 모달 구현
    console.log('Study clicked:', studyId);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Podium Skeleton */}
        <div className="flex justify-center gap-8 pt-4 pb-8">
          <div className="mt-8 h-48 w-32 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-56 w-32 bg-muted/30 rounded-lg animate-pulse" />
          <div className="mt-8 h-48 w-32 bg-muted/30 rounded-lg animate-pulse" />
        </div>

        {/* Search Bar Skeleton */}
        <div className="h-12 w-full rounded-full bg-muted/30 animate-pulse" />

        {/* Scope Toggle Skeleton */}
        <div className="flex gap-1.5 p-1">
          <div className="h-9 w-24 bg-muted/30 rounded-md animate-pulse" />
          <div className="h-9 w-24 bg-muted/30 rounded-md animate-pulse" />
        </div>

        {/* List Items Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 w-full bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">에러: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <StudyRankingList
        rankings={rankings}
        onStudyClick={handleStudyClick}
        scope={scope}
        onScopeChange={handleScopeChange}
      >
        {currentPage === 0 && topThreeRankings.length > 0 && (
          <TopThreePodium rankings={topThreeRankings} onStudyClick={handleStudyClick} />
        )}
      </StudyRankingList>

      {totalPages > 0 && (
        <RankingPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
