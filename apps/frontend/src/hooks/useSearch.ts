import { useInfiniteQuery, UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { fetchSearchResults, SearchResponse, SearchCategory } from '@/api/searchApi';
import {
  MIN_SEARCH_LENGTH,
  SEARCH_STALE_TIME_MS,
  normalizeSearchKeyword,
  normalizeSearchList,
  searchQueryKeys,
} from '@/lib/search/searchConfig';

export { MIN_SEARCH_LENGTH };

interface UseSearchParams {
  keyword: string;
  category?: SearchCategory;
  size?: number;
  tiers?: string[];
  tags?: string[];
  enabled?: boolean;
}

type UseSearchResult = UseInfiniteQueryResult<InfiniteData<SearchResponse, unknown>, Error>;

export function useSearch({
  keyword,
  category = 'ALL',
  size = 20,
  tiers,
  tags,
  enabled = true,
}: UseSearchParams): UseSearchResult {
  const normalizedKeyword = normalizeSearchKeyword(keyword);
  const normalizedTiers = normalizeSearchList(tiers);
  const normalizedTags = normalizeSearchList(tags);

  return useInfiniteQuery<SearchResponse, Error>({
    queryKey: searchQueryKeys.results({
      keyword: normalizedKeyword,
      category,
      size,
      tiers: normalizedTiers,
      tags: normalizedTags,
    }),
    queryFn: ({ pageParam = 0, signal }) =>
      fetchSearchResults(
        {
          keyword: normalizedKeyword,
          category,
          page: pageParam as number,
          size,
          tiers: normalizedTiers,
          tags: normalizedTags,
        },
        {
          signal,
        },
      ),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages - 1 ? page + 1 : undefined;
    },
    enabled: enabled && normalizedKeyword.length >= MIN_SEARCH_LENGTH,
    staleTime: SEARCH_STALE_TIME_MS,
    initialPageParam: 0,
  });
}

/**
 * Query key factory for search queries
 * Useful for invalidation and prefetching
 */
export const searchKeys = {
  all: searchQueryKeys.all,
  lists: () => [...searchQueryKeys.all, 'list'] as const,
  list: (filters: { query: string; type?: string }) =>
    [...searchKeys.lists(), { ...filters, query: normalizeSearchKeyword(filters.query) }] as const,
  details: () => [...searchKeys.all, 'detail'] as const,
  detail: (id: number) => [...searchKeys.details(), id] as const,
};
