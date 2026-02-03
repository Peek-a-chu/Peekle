'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getRankings, type RankResponse } from '@/api/rankingApi';
import { TopThreePodium } from './TopThreePodium';
import { StudyRankingList } from './StudyRankingList';
import { RankingPagination } from './RankingPagination';
import { Card, CardContent } from '@/components/ui/card';

export function StudyRankingBoard(): React.ReactNode {
  const [rankings, setRankings] = useState<RankResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [scope, setScope] = useState<'ALL' | 'MINE'>('ALL');
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const pageSize = 10;

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
    setExpandedIds([]);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleStudyClick = (studyId: number): void => {
    // TODO: S8-2에서 상세 모달 구현
    console.log('Study clicked:', studyId);
    
    // Expand the clicked study if not already expanded
    if (scope !== 'ALL') setScope('ALL');
    setExpandedIds((prev) => (prev.includes(studyId) ? prev : [...prev, studyId]));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center gap-8">
          <div className="h-48 w-32 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-56 w-32 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-48 w-32 bg-muted/30 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
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

  const topThree = rankings.slice(0, 3);

  return (
    <div className="space-y-2">
      <StudyRankingList
        rankings={rankings}
        onStudyClick={handleStudyClick}
        scope={scope}
        onScopeChange={handleScopeChange}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
      >
        {currentPage === 0 && topThree.length > 0 && scope === 'ALL' && (
          <TopThreePodium rankings={topThree} onStudyClick={handleStudyClick} />
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
