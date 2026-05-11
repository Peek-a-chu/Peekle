import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { fetchSearchResults } from '@/api/searchApi';
import {
  MIN_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  SEARCH_STALE_TIME_MS,
  SEARCH_SUGGESTION_SIZE,
  isAbortError,
  normalizeSearchKeyword,
  searchQueryKeys,
} from '@/lib/search/searchConfig';

export interface SearchSuggestion {
  id: number;
  title: string;
  type: 'problem' | 'user' | 'workbook';
  tier?: string;
  externalId?: string;
  profileImg?: string;
}

export function useSearchSuggestions(query: string) {
  const normalizedQuery = normalizeSearchKeyword(query);
  const [debouncedQuery] = useDebounce(normalizedQuery, SEARCH_DEBOUNCE_MS);
  const isEnabled = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const queryResult = useQuery({
    queryKey: searchQueryKeys.suggestions({
      keyword: debouncedQuery,
      category: 'ALL',
      size: SEARCH_SUGGESTION_SIZE,
    }),
    queryFn: ({ signal }) =>
      fetchSearchResults(
        {
          keyword: debouncedQuery,
          category: 'ALL',
          page: 0,
          size: SEARCH_SUGGESTION_SIZE,
        },
        { signal },
      ),
    enabled: isEnabled,
    staleTime: SEARCH_STALE_TIME_MS,
    retry: (failureCount, error) => !isAbortError(error) && failureCount < 1,
  });

  const suggestions = useMemo(() => {
    if (!isEnabled || !queryResult.data) {
      return [];
    }

    const { problems, workbooks, users } = queryResult.data.data;
    const nextSuggestions: SearchSuggestion[] = [];

    problems.forEach((problem) =>
      nextSuggestions.push({
        id: problem.problemId,
        title: problem.title,
        type: 'problem',
        tier: problem.tier,
        externalId: problem.externalId,
      }),
    );

    users.forEach((user) =>
      nextSuggestions.push({
        id: user.userId,
        title: user.handle,
        type: 'user',
        tier: user.tier,
        profileImg: user.profileImg,
      }),
    );

    workbooks.forEach((workbook) =>
      nextSuggestions.push({
        id: workbook.workbookId,
        title: workbook.title,
        type: 'workbook',
      }),
    );

    return nextSuggestions;
  }, [isEnabled, queryResult.data]);

  return {
    suggestions,
    isLoading: isEnabled && queryResult.isFetching,
    error: isAbortError(queryResult.error) ? null : queryResult.error,
    isStale: queryResult.isStale,
  };
}
