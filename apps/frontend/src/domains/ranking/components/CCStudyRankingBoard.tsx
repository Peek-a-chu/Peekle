'use client';

import { useState, useEffect, useMemo } from 'react';
import { getRankings, type RankResponse } from '@/api/rankingApi';
import { useDebounce } from '@/hooks/useDebounce';
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
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'RANK' | 'POINT' | 'MEMBERS'>('RANK');
  const [focusStudyId, setFocusStudyId] = useState<number | null>(null);
  const [highlightedStudyId, setHighlightedStudyId] = useState<number | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const fetchRankings = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        // If we are on Page 0 and ALL scope, we can get top 3 from the main list.
        // Otherwise, we need to ensure top 3 exists (fetch if missing).
        const isPageZeroAndAll = currentPage === 0 && scope === 'ALL' && !debouncedSearchTerm;
        const needTopThree = topThreeRankings.length === 0 && !isPageZeroAndAll;

        const mainQueryPromise = getRankings(currentPage, pageSize, debouncedSearchTerm, scope);
        const topThreeQueryPromise = needTopThree
          ? getRankings(0, 3, undefined, 'ALL')
          : Promise.resolve(null);

        const [mainData, topThreeData] = await Promise.all([
          mainQueryPromise,
          topThreeQueryPromise,
        ]);

        setRankings(mainData.content);
        setTotalPages(mainData.totalPages);
        setTotalElements(mainData.totalElements);

        if (isPageZeroAndAll) {
          setTopThreeRankings(mainData.content.slice(0, 3));
        } else if (topThreeData) {
          setTopThreeRankings(topThreeData.content);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rankings');
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, scope, debouncedSearchTerm]); // topThreeRankings is excluded to prevent loop

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    setExpandedIds([]); // Collapse all when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScopeChange = (newScope: 'ALL' | 'MINE'): void => {
    if (scope === newScope) return;
    setScope(newScope);
    setCurrentPage(0);
    setExpandedIds([]); // Collapse all when scope changes
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleStudyClick = (studyId: number): void => {
    // Podium click should always land on the canonical ranking view
    // (page 1 / ALL scope / no search filter), then open and focus the target team.
    if (searchTerm) setSearchTerm('');
    if (scope !== 'ALL') setScope('ALL');
    if (currentPage !== 0) setCurrentPage(0);
    setFocusStudyId(studyId);
    setHighlightedStudyId(studyId);

    // Expand the clicked study if not already expanded
    setExpandedIds((prev) => (prev.includes(studyId) ? prev : [...prev, studyId]));
  };

  useEffect(() => {
    if (!focusStudyId || isLoading || currentPage !== 0 || scope !== 'ALL') return;
    const hasTarget = rankings.some((ranking) => ranking.studyId === focusStudyId);
    if (!hasTarget) return;

    const element = document.getElementById(`ranking-study-${focusStudyId}`);
    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.setAttribute('tabindex', '-1');
      (element as HTMLElement).focus({ preventScroll: true });
      setFocusStudyId(null);
    });
  }, [focusStudyId, isLoading, currentPage, scope, rankings]);

  useEffect(() => {
    if (!highlightedStudyId) return;
    const timer = window.setTimeout(() => setHighlightedStudyId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightedStudyId]);

  const sortedRankings = useMemo(() => {
    const copied = [...rankings];
    if (sortBy === 'POINT') {
      copied.sort((a, b) => b.totalPoint - a.totalPoint || a.rank - b.rank);
      return copied;
    }
    if (sortBy === 'MEMBERS') {
      copied.sort((a, b) => b.memberCount - a.memberCount || a.rank - b.rank);
      return copied;
    }
    copied.sort((a, b) => a.rank - b.rank);
    return copied;
  }, [rankings, sortBy]);

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
        rankings={sortedRankings}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onStudyClick={handleStudyClick}
        highlightedStudyId={highlightedStudyId}
        scope={scope}
        onScopeChange={handleScopeChange}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      >
        {topThreeRankings.length > 0 && (
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
