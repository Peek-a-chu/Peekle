import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSearchResults, type SearchResponse } from '@/api/searchApi';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_STALE_TIME_MS,
  normalizeSearchKeyword,
  normalizeSearchList,
  searchQueryKeys,
} from '@/lib/search/searchConfig';
import { useSearchSuggestions } from './useSearchSuggestions';

vi.mock('@/api/searchApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/searchApi')>();

  return {
    ...actual,
    fetchSearchResults: vi.fn(),
  };
});

const mockedFetchSearchResults = vi.mocked(fetchSearchResults);

function createSearchResponse(title: string): SearchResponse {
  return {
    category: 'ALL',
    counts: null,
    data: {
      problems: [
        {
          problemId: title.length,
          title,
          tier: 'Bronze 5',
          tags: [],
          externalId: String(title.length),
        },
      ],
      workbooks: [],
      users: [],
    },
    pagination: {
      page: 0,
      size: 4,
      totalElements: 1,
      totalPages: 1,
    },
  };
}

function createWrapper(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    await Promise.resolve();
  });
}

async function flushReactQuery() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('search config', () => {
  it('normalizes query keys consistently', () => {
    expect(normalizeSearchKeyword('  binary   search  ')).toBe('binary search');
    expect(normalizeSearchList(['Gold', ' ', 'Silver', 'Gold'])).toEqual(['Gold', 'Silver']);
    expect(
      searchQueryKeys.suggestions({
        keyword: '  binary   search  ',
        category: 'ALL',
        size: 4,
        tiers: ['Silver', 'Gold'],
        tags: ['dp', 'dp'],
      }),
    ).toEqual(['search', 'suggestions', 'binary search', 'ALL', 4, ['Gold', 'Silver'], ['dp']]);
  });
});

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedFetchSearchResults.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the named debounce window before requesting suggestions', async () => {
    mockedFetchSearchResults.mockResolvedValue(createSearchResponse('debounced'));

    const { rerender } = renderHook(({ query }) => useSearchSuggestions(query), {
      initialProps: { query: '' },
      wrapper: createWrapper(),
    });

    rerender({ query: 'debounced' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
    });

    expect(mockedFetchSearchResults).not.toHaveBeenCalled();

    await flushDebounce();

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(1);
  });

  it('passes TanStack Query AbortSignal to stale in-flight requests', async () => {
    const signals: AbortSignal[] = [];

    mockedFetchSearchResults.mockImplementation((_params, options) => {
      if (options?.signal) {
        signals.push(options.signal);
      }

      return new Promise<SearchResponse>(() => undefined);
    });

    const { rerender } = renderHook(({ query }) => useSearchSuggestions(query), {
      initialProps: { query: '' },
      wrapper: createWrapper(),
    });

    rerender({ query: 'slow' });
    await flushDebounce();
    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(1);

    rerender({ query: 'fast' });
    await flushDebounce();

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
  });

  it('uses staleTime cache for repeated identical queries', async () => {
    vi.useRealTimers();

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: SEARCH_STALE_TIME_MS } },
    });

    mockedFetchSearchResults.mockResolvedValue(createSearchResponse('cached'));

    const first = renderHook(({ query }) => useSearchSuggestions(query), {
      initialProps: { query: 'cached' },
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(first.result.current.suggestions).toHaveLength(1));
    first.unmount();

    renderHook(({ query }) => useSearchSuggestions(query), {
      initialProps: { query: 'cached' },
      wrapper: createWrapper(queryClient),
    });

    await flushReactQuery();

    expect(mockedFetchSearchResults).toHaveBeenCalledTimes(1);
  });

  it('does not let a late stale response overwrite the latest query results', async () => {
    vi.useRealTimers();

    let resolveSlow: ((response: SearchResponse) => void) | undefined;
    let resolveFast: ((response: SearchResponse) => void) | undefined;

    mockedFetchSearchResults.mockImplementation(({ keyword }) => {
      if (keyword === 'slow') {
        return new Promise<SearchResponse>((resolve) => {
          resolveSlow = resolve;
        });
      }

      return new Promise<SearchResponse>((resolve) => {
        resolveFast = resolve;
      });
    });

    const { result, rerender } = renderHook(({ query }) => useSearchSuggestions(query), {
      initialProps: { query: 'slow' },
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockedFetchSearchResults).toHaveBeenCalledTimes(1));

    rerender({ query: 'fast' });
    await waitFor(() => expect(mockedFetchSearchResults).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveFast?.(createSearchResponse('fast-result'));
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.suggestions[0]?.title).toBe('fast-result'));

    await act(async () => {
      resolveSlow?.(createSearchResponse('slow-result'));
      await Promise.resolve();
    });

    expect(result.current.suggestions[0]?.title).toBe('fast-result');
  });
});
