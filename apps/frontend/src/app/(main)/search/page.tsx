'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { SearchErrorBoundary } from '@/components/search/SearchErrorBoundary';
import { useSearch, MIN_SEARCH_LENGTH } from '@/hooks/useSearch';
import { Search, AlertCircle, Loader2, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchCategory, SearchResultItem as SearchResultItemType } from '@/api/searchApi';

// Import extracted modules
import { SearchResultSection } from './components/SearchResultSection';
import { SearchResultItem } from './components/SearchResultItem';
import { UserGridItem } from './components/UserGridItem';
import { WorkbookGridItem } from './components/WorkbookGridItem';
import { TABS, TIER_COLORS, SUGGESTED_KEYWORDS } from './components/search.constants';
import { isProblem, isUser, isWorkbook, type SearchType } from './components/search.types';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams?.get('q') || '';
  const activeTab = (searchParams?.get('type') as SearchType) || 'all';

  const setActiveTab = (tab: SearchType) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('type', tab);
    router.push(`/search?${params.toString()}`);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTiers, setActiveTiers] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tempTiers, setTempTiers] = useState<string[]>([]);
  const [tempTags, setTempTags] = useState<string[]>([]);

  const observerTarget = useRef<HTMLDivElement>(null);
  const isAll = activeTab === 'all';

  const toggleFilter = () => {
    if (!isFilterOpen) {
      setTempTiers(activeTiers);
      setTempTags(activeTags);
    }
    setIsFilterOpen(!isFilterOpen);
  };

  const handleApplyFilter = () => {
    setActiveTiers(tempTiers);
    setActiveTags(tempTags);
    setIsFilterOpen(false);
  };

  const handleCancelFilter = () => {
    setIsFilterOpen(false);
  };

  const toggleTempTier = (tier: string) => {
    setTempTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const toggleTempTag = (tag: string) => {
    setTempTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSearch = (searchQuery: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('q', searchQuery);
    params.set('type', activeTab);
    router.push(`/search?${params.toString()}`);
  };

  const handleTabChange = (tab: SearchType) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('q', query);
    params.set('type', tab);
    router.push(`/search?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setTempTiers([]);
    setTempTags([]);
  };

  const currentCategory = isAll ? 'ALL' : (activeTab.toUpperCase() as SearchCategory);

  const { data, isPending, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearch({
      keyword: query,
      category: currentCategory,
      size: isAll ? 20 : 20,
      tiers: activeTiers.length > 0 ? activeTiers : undefined,
      tags: activeTags.length > 0 ? activeTags : undefined,
      enabled: !!query && query.trim().length >= MIN_SEARCH_LENGTH,
    });

  useEffect(() => {
    if (data) {
      console.log('Search Data (first page):', data.pages[0]);
    }
    console.log('Search State:', { isLoading, error, hasData: !!data, query });
  }, [data, isLoading, error, query]);

  useEffect(() => {
    if (!observerTarget.current || isAll) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isAll]);

  const handleItemClick = (result: SearchResultItemType) => {
    if (isProblem(result)) {
      window.open(
        `https://www.acmicpc.net/problem/${result.externalId || result.problemId}`,
        '_blank',
      );
    } else if (isWorkbook(result)) {
      router.push(`/workbooks?id=${result.workbookId}`);
    } else if (isUser(result)) {
      router.push(`/profile/${encodeURIComponent(result.handle)}`);
    }
  };

  const problemResults = isAll ? data?.pages[0]?.data.problems || [] : [];
  const workbookResults = isAll ? data?.pages[0]?.data.workbooks || [] : [];
  const userResults = isAll ? data?.pages[0]?.data.users || [] : [];

  const singleResults: SearchResultItemType[] = !isAll
    ? data?.pages.flatMap((page) => {
      const d = page.data;
      if (activeTab === 'problem') return d.problems as SearchResultItemType[];
      if (activeTab === 'workbook') return d.workbooks as SearchResultItemType[];
      if (activeTab === 'user') return d.users as SearchResultItemType[];
      return [] as SearchResultItemType[];
    }) || []
    : [];

  const hasResults = isAll
    ? problemResults.length > 0 || workbookResults.length > 0 || userResults.length > 0
    : (data?.pages[0]?.pagination?.totalElements || 0) > 0;

  const totalCount = data?.pages[0]?.pagination?.totalElements || 0;
  const showEmptyState = !isPending && !error && query && !hasResults;
  const showLoading = isPending && query.trim().length >= MIN_SEARCH_LENGTH;

  return (
    <SearchErrorBoundary>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-200">
          <h1 className="mb-6 text-2xl font-bold text-foreground">검색</h1>

          <div className="mb-8">
            <GlobalSearchBar
              initialQuery={query}
              onSearch={handleSearch}
              className="max-w-none shadow-sm h-12"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border mb-6">
            <div className="flex overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-1 py-3 mr-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={toggleFilter}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors mb-2 sm:mb-0 ml-auto sm:ml-0',
                isFilterOpen || activeTiers.length > 0 || activeTags.length > 0
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Filter className="h-4 w-4" />
              필터
              {(activeTiers.length > 0 || activeTags.length > 0) && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeTiers.length + activeTags.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel - keeping inline due to state coupling */}
          {isFilterOpen && (
            <div className="bg-card p-6 rounded-2xl border border-border mb-8 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tier Filter */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">백준 티어</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(TIER_COLORS).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => toggleTempTier(tier)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                          tempTiers.includes(tier)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-primary bg-card',
                        )}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Problem Tag Filter */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">문제 태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_KEYWORDS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTempTag(tag)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                          tempTags.includes(tag)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-primary bg-card',
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <button
                  onClick={handleResetFilter}
                  className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  초기화
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelFilter}
                    className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    적용하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {showLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                열심히 검색하고 있어요...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-bold text-foreground">검색 중 오류가 발생했습니다</p>
              <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                다시 시도
              </button>
            </div>
          )}

          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">검색 결과가 없어요</p>
              <p className="mt-2 text-muted-foreground">다른 키워드로 검색해보시겠어요?</p>
              <div className="mt-8 w-full max-w-md"></div>
            </div>
          )}

          {!showLoading &&
            !error &&
            hasResults &&
            (isAll ? (
              <div className="space-y-8 pb-8">
                <SearchResultSection
                  title="문제"
                  type="problem"
                  results={problemResults}
                  query={query}
                  onMoreClick={() => setActiveTab('problem')}
                  onItemClick={handleItemClick}
                />
                <SearchResultSection
                  title="문제집"
                  type="workbook"
                  results={workbookResults}
                  query={query}
                  onMoreClick={() => setActiveTab('workbook')}
                  onItemClick={handleItemClick}
                />
                <SearchResultSection
                  title="사용자"
                  type="user"
                  results={userResults}
                  query={query}
                  onMoreClick={() => setActiveTab('user')}
                  onItemClick={handleItemClick}
                />
              </div>
            ) : (
              <>
                {activeTab === 'user' || activeTab === 'workbook' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {singleResults.map((result) => {
                      if (isUser(result)) {
                        return (
                          <UserGridItem
                            key={result.userId}
                            result={result}
                            query={query}
                            onClick={() => handleItemClick(result)}
                          />
                        );
                      }
                      if (isWorkbook(result)) {
                        return (
                          <WorkbookGridItem
                            key={result.workbookId}
                            result={result}
                            query={query}
                            onClick={() => handleItemClick(result)}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="bg-card rounded-[24px] border border-border divide-y divide-border overflow-hidden">
                    {singleResults.map((result) => (
                      <SearchResultItem
                        key={
                          isProblem(result)
                            ? `p-${result.problemId}`
                            : isUser(result)
                              ? `u-${result.userId}`
                              : isWorkbook(result)
                                ? `w-${result.workbookId}`
                                : 'unknown'
                        }
                        result={result}
                        query={query}
                        onClick={() => handleItemClick(result)}
                      />
                    ))}
                  </div>
                )}

                {hasNextPage && (
                  <div ref={observerTarget} className="flex justify-center py-8">
                    {isFetchingNextPage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <div className="h-8" />
                    )}
                  </div>
                )}
              </>
            ))}

          {!query && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2 text-center">
                  어떤 문제를 찾고 계신가요?
                </h2>
                <p className="text-muted-foreground text-center">
                  문제, 사용자, 문제집을 검색하여 학습을 시작해보세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </SearchErrorBoundary>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background py-8">
          <div className="mx-auto max-w-5xl px-6 flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
