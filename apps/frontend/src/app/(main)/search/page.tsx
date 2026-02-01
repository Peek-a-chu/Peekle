'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { SearchErrorBoundary } from '@/components/search/SearchErrorBoundary';
import { useSearch, MIN_SEARCH_LENGTH } from '@/hooks/useSearch';
import { Search, AlertCircle, Loader2, Filter, LayoutGrid, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SearchCategory,
  Problem,
  Workbook,
  User as SearchUser,
  SearchResultItem as SearchResultItemType,
} from '@/api/searchApi';
import ProblemIcon from '@/assets/icons/problem.svg';
import BookIcon from '@/assets/icons/book.svg';
import PeopleIcon from '@/assets/icons/people.svg';

type SearchType = 'all' | 'problem' | 'user' | 'workbook';

const TABS: { value: SearchType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '전체', icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'problem', label: '문제', icon: <ProblemIcon className="h-4 w-4" /> },
  { value: 'workbook', label: '문제집', icon: <BookIcon className="h-4 w-4" /> },
  { value: 'user', label: '사용자', icon: <PeopleIcon className="h-4 w-4" /> },
];

const SUGGESTED_KEYWORDS = [
  'DP',
  'DFS',
  'BFS',
  'Binary Search',
  'Graph',
  'Greedy',
  'Implementation',
  'Math',
];

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  BRONZE: { bg: 'bg-[#AD5600]/10', text: 'text-[#AD5600]' },
  SILVER: { bg: 'bg-[#435F7A]/10', text: 'text-[#435F7A]' },
  GOLD: { bg: 'bg-[#EC9A00]/10', text: 'text-[#EC9A00]' },
  PLATINUM: { bg: 'bg-[#27E2A4]/10', text: 'text-[#27E2A4]' },
  DIAMOND: { bg: 'bg-[#00B4FC]/10', text: 'text-[#00B4FC]' },
  RUBY: { bg: 'bg-[#FF0062]/10', text: 'text-[#FF0062]' },
  MASTER: { bg: 'bg-[#B300E0]/10', text: 'text-[#B300E0]' },
};

const getTierStyle = (tierStr?: string) => {
  if (!tierStr) return { bg: 'bg-gray-100', text: 'text-gray-600' };

  // Try to match standard keys first, or parse "Bronze 5" / "BRONZE_5"
  let tierKey = tierStr.toUpperCase();
  if (tierKey.includes(' ')) {
    tierKey = tierKey.split(' ')[0]; // "BRONZE 5" -> "BRONZE"
  } else if (tierKey.includes('_')) {
    tierKey = tierKey.split('_')[0]; // "BRONZE_5" -> "BRONZE"
  }

  return TIER_COLORS[tierKey] || { bg: 'bg-gray-100', text: 'text-gray-600' };
};

const highlightMatch = (text: string, searchQuery: string): React.JSX.Element => {
  if (!text) return <></>;
  if (!searchQuery) return <>{text}</>;

  // Escape special regex characters
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-[#E24EA0]/20 text-[#E24EA0] font-semibold rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
};

const isProblem = (item: SearchResultItemType): item is Problem => 'problemId' in item;
const isUser = (item: SearchResultItemType): item is SearchUser => 'userId' in item;
const isWorkbook = (item: SearchResultItemType): item is Workbook => 'workbookId' in item;

const SearchResultItem = ({
  result,
  query,
  onClick,
}: {
  result: SearchResultItemType;
  query: string;
  onClick: () => void;
}) => {
  let tierStyle = { bg: 'bg-gray-100', text: 'text-gray-600' };
  let title = '';
  let description = '';
  let tags: string[] = [];
  let tier = '';

  if (isProblem(result)) {
    tierStyle = getTierStyle(result.tier);
    title = result.title;
    tier = result.tier;
    tags = result.tags;
  } else if (isUser(result)) {
    tierStyle = getTierStyle(result.tier);
    title = result.handle; // User uses handle as title
    description = `${result.league} • ${result.score} pts`;
    tier = result.tier;
  } else if (isWorkbook(result)) {
    title = result.title;
    description = result.description;
    // tags = result.tags; // Tags removed from display as per request
  }

  return (
    <div className="relative flex items-center gap-4 p-4 min-h-[72px]" onClick={onClick}>
      {/* Left Indicator */}
      <div className="flex-shrink-0 w-16 flex justify-center">
        {isProblem(result) ? (
          <div
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap',
              tierStyle.bg,
              tierStyle.text,
            )}
          >
            {tier?.split('_')[0] || 'Unrated'}
          </div>
        ) : isUser(result) ? (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
            <PeopleIcon className="h-5 w-5 text-gray-500" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
            <BookIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-base font-bold text-[#040C13] truncate mb-0.5">
          {highlightMatch(title, query)}
        </h3>
        {description && (
          <p className="text-sm text-[#9DA7B0] line-clamp-1">
            {highlightMatch(description, query)}
          </p>
        )}
      </div>

      {/* Desktop Tags (Visible on larger screens) */}
      <div className="hidden md:flex items-center gap-2 mr-4">
        {tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-xs font-medium text-[#9DA7B0] bg-[#F7F8FC] px-2 py-1 rounded"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

const UserGridItem = ({
  result,
  query,
  onClick,
}: {
  result: SearchUser;
  query: string;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center p-5 bg-white rounded-2xl border border-[#D8DFE4] h-[132px] hover:border-[#E24EA0] transition-colors cursor-pointer gap-4 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]"
    >
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[#F7F8FC] flex items-center justify-center border border-[#F2F4F7] overflow-hidden">
        <img
          src={
            result.profileImage ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${result.handle}`
          }
          alt={result.handle}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-bold text-[#040C13] truncate">
            {highlightMatch(result.handle, query)}
          </h3>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-bold',
              TIER_COLORS[result.tier]?.bg || 'bg-gray-100',
              TIER_COLORS[result.tier]?.text || 'text-gray-500',
            )}
          ></span>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-[#59656E]">
            {result.league} • {result.score}P
          </p>
        </div>
      </div>
    </div>
  );
};

const WorkbookGridItem = ({
  result,
  query,
  onClick,
}: {
  result: Workbook;
  query: string;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="flex flex-col p-5 bg-white rounded-2xl border border-[#D8DFE4] h-full"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
          <BookIcon className="h-5 w-5" />
        </div>
        <h3 className="flex-1 text-base font-bold text-[#040C13] line-clamp-1">
          {highlightMatch(result.title, query)}
        </h3>
      </div>

      {result.description && (
        <p className="text-sm text-[#9DA7B0] line-clamp-2 min-h-[40px] mb-3">
          {highlightMatch(result.description, query)}
        </p>
      )}

      {/* Problem Count */}
      <div className="text-xs font-medium text-[#59656E] mb-3">
        총 {result.problemCount || 0}문제
      </div>
    </div>
  );
};

const SearchResultSection = ({
  title,
  type,
  results,
  query,
  onMoreClick,
  onItemClick,
}: {
  title: string;
  type: SearchType;
  results: SearchResultItemType[];
  query: string;
  onMoreClick: () => void;
  onItemClick: (result: SearchResultItemType) => void;
}) => {
  if (results.length === 0) return null;

  const isGrid = type === 'user' || type === 'workbook';

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-bold text-[#040C13]">{title}</h2>
        <button
          onClick={onMoreClick}
          className="text-sm font-medium text-[#59656E] hover:text-[#E24EA0] transition-colors"
        >
          더보기
        </button>
      </div>

      {isGrid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {results.map((result) => {
            if (type === 'user' && isUser(result)) {
              return (
                <UserGridItem
                  key={result.userId}
                  result={result}
                  query={query}
                  onClick={() => onItemClick(result)}
                />
              );
            } else if (type === 'workbook' && isWorkbook(result)) {
              return (
                <WorkbookGridItem
                  key={result.workbookId}
                  result={result}
                  query={query}
                  onClick={() => onItemClick(result)}
                />
              );
            }
            return null;
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-[#D8DFE4] divide-y divide-[#D8DFE4] overflow-hidden">
          {results.map((result) => (
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
              onClick={() => onItemClick(result)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State is Source of Truth
  const query = searchParams?.get('q') || '';
  const activeTab = (searchParams?.get('type') as SearchType) || 'all';

  const setActiveTab = (tab: SearchType) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('type', tab);
    router.push(`/search?${params.toString()}`);
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states
  const [activeTiers, setActiveTiers] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tempTiers, setTempTiers] = useState<string[]>([]);
  const [tempTags, setTempTags] = useState<string[]>([]);

  const observerTarget = useRef<HTMLDivElement>(null);

  const isAll = activeTab === 'all';

  // Open/Close filter logic with temp state
  const toggleFilter = () => {
    if (!isFilterOpen) {
      // Opening: Sync temp state with active state
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
    // No need to revert temp state as it will be synced on next open
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

  // Unified query for both "All" and specific tabs
  const { data, isPending, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearch({
      keyword: query,
      category: currentCategory,
      size: isAll ? 20 : 20, // "All"일 때 backend가 적절히 배분하여 반환한다고 가정 (혹은 충분히 큰 수)
      tiers: activeTiers.length > 0 ? activeTiers : undefined,
      tags: activeTags.length > 0 ? activeTags : undefined,
      enabled: !!query && query.trim().length >= MIN_SEARCH_LENGTH, // 검색어가 있을 때만 활성화
    });

  useEffect(() => {
    if (data) {
      console.log('Search Data (first page):', data.pages[0]);
    }
    console.log('Search State:', { isLoading, error, hasData: !!data, query });
  }, [data, isLoading, error, query]);

  // Infinite scroll using Intersection Observer
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

  const handleSuggestedKeywordClick = (keyword: string) => {
    handleSearch(keyword);
  };

  const handleItemClick = (result: SearchResultItemType) => {
    // 검색 결과 클릭 시 이동 기능 비활성화
  };

  // Result calculations
  // 'ALL' 카테고리일 때는 data.data.problems/workbooks/users 에 각각 데이터가 담겨옴
  const problemResults = isAll ? data?.pages[0]?.data.problems || [] : [];
  const workbookResults = isAll ? data?.pages[0]?.data.workbooks || [] : [];
  const userResults = isAll ? data?.pages[0]?.data.users || [] : [];

  const singleResults: SearchResultItemType[] = !isAll
    ? data?.pages.flatMap((page) => {
        const d = page.data;
        // Explicitly return as generic SearchResultItemType arrays to avoid union mismatch in flatMap inference
        if (activeTab === 'problem') return d.problems as SearchResultItemType[];
        if (activeTab === 'workbook') return d.workbooks as SearchResultItemType[];
        if (activeTab === 'user') return d.users as SearchResultItemType[];
        return [] as SearchResultItemType[];
      }) || []
    : [];

  // Calculate if we have any results to show
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
          <h1 className="mb-6 text-2xl font-bold text-[#040C13]">검색</h1>

          {/* Search Bar */}
          <div className="mb-8">
            <GlobalSearchBar
              initialQuery={query}
              onSearch={handleSearch}
              className="max-w-none shadow-sm h-12"
            />
          </div>

          {/* Tabs & Filter Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D8DFE4] mb-6">
            <div className="flex overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-1 py-3 mr-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.value
                      ? 'border-[#040C13] text-[#040C13]'
                      : 'border-transparent text-[#59656E] hover:text-[#040C13]',
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
                  ? 'bg-[#E24EA0]/10 text-[#E24EA0]'
                  : 'text-[#59656E] hover:bg-gray-100',
              )}
            >
              <Filter className="h-4 w-4" />
              필터
              {(activeTiers.length > 0 || activeTags.length > 0) && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E24EA0] text-[10px] text-white">
                  {activeTiers.length + activeTags.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Container */}
          {isFilterOpen && (
            <div className="bg-white p-6 rounded-2xl border border-[#D8DFE4] mb-8 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Difficulty Section */}
                <div>
                  <h3 className="text-sm font-bold text-[#040C13] mb-3">백준 티어</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(TIER_COLORS).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => toggleTempTier(tier)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                          tempTiers.includes(tier)
                            ? 'border-[#E24EA0] bg-[#E24EA0]/10 text-[#E24EA0]'
                            : 'border-[#D8DFE4] text-[#59656E] hover:border-[#E24EA0] hover:text-[#E24EA0] bg-white',
                        )}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Section */}
                <div>
                  <h3 className="text-sm font-bold text-[#040C13] mb-3">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() => toggleTempTag(keyword)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                          tempTags.includes(keyword)
                            ? 'border-[#E24EA0] bg-[#E24EA0]/10 text-[#E24EA0]'
                            : 'border-[#D8DFE4] text-[#59656E] hover:border-[#E24EA0] hover:text-[#E24EA0] bg-white',
                        )}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F2F4F7]">
                <button
                  onClick={handleResetFilter}
                  className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-[#9DA7B0] hover:text-[#59656E] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  초기화
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelFilter}
                    className="px-4 py-2 text-sm font-bold text-[#59656E] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="px-4 py-2 text-sm font-bold text-white bg-[#040C13] hover:bg-[#040C13]/90 rounded-lg transition-colors"
                  >
                    적용하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State (Initial) */}
          {showLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#E24EA0]" />
              <p className="mt-4 text-sm font-medium text-[#59656E]">열심히 검색하고 있어요...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-bold text-[#040C13]">검색 중 오류가 발생했습니다</p>
              <p className="mt-2 text-sm text-[#59656E]">{error.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 rounded-lg bg-[#E24EA0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E24EA0]/90 transition-colors shadow-sm"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-xl font-bold text-[#040C13]">검색 결과가 없어요</p>
              <p className="mt-2 text-[#59656E]">다른 키워드로 검색해보시겠어요?</p>

              <div className="mt-8 w-full max-w-md"></div>
            </div>
          )}

          {/* Results List */}
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
                  <div className="bg-white rounded-[24px] border border-[#D8DFE4] divide-y divide-[#D8DFE4] overflow-hidden">
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

                {/* Infinite Scroll Trigger */}
                {hasNextPage && (
                  <div ref={observerTarget} className="flex justify-center py-8">
                    {isFetchingNextPage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[#E24EA0]" />
                    ) : (
                      <div className="h-8" />
                    )}
                  </div>
                )}
              </>
            ))}

          {/* No Query State */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-[#040C13] mb-2 text-center">
                  어떤 문제를 찾고 계신가요?
                </h2>
                <p className="text-[#59656E] text-center">
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
        <div className="min-h-screen bg-[#F7F8FC] py-8">
          <div className="mx-auto max-w-5xl px-6 flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#E24EA0]" />
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
