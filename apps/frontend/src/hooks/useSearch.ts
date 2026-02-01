import { useInfiniteQuery, UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { fetchSearchResults, SearchResponse, SearchCategory } from '@/api/searchApi';

export const MIN_SEARCH_LENGTH = 1;
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

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
  return useInfiniteQuery<SearchResponse, Error>({
    queryKey: ['search', keyword, category, tiers, tags] as const,
    queryFn: ({ pageParam = 0 }) =>
      fetchSearchResults({
        keyword,
        category,
        page: pageParam as number,
        size,
        tiers,
        tags,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages - 1 ? page + 1 : undefined;
    },
    enabled: enabled && keyword.trim().length >= MIN_SEARCH_LENGTH,
    staleTime: STALE_TIME_MS,
    initialPageParam: 0,
  });
}

/**
 * Query key factory for search queries
 * Useful for invalidation and prefetching
 */
export const searchKeys = {
  all: ['search'] as const,
  lists: () => [...searchKeys.all, 'list'] as const,
  list: (filters: { query: string; type?: string }) => [...searchKeys.lists(), filters] as const,
  details: () => [...searchKeys.all, 'detail'] as const,
  detail: (id: number) => [...searchKeys.details(), id] as const,
};
