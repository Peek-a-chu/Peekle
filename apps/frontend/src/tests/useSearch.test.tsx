import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch } from '@/hooks/useSearch';
import { SearchCategory, SearchResponse } from '@/api/searchApi';
import * as React from 'react';

// Mock the search API
vi.mock('@/api/searchApi', () => ({
  fetchSearchResults: vi.fn(({ keyword, category, page }) => {
    return Promise.resolve({
      category: category || 'ALL',
      counts: null,
      pagination: {
        page: page || 0,
        size: 20,
        totalElements: 25,
        totalPages: 2,
      },
      data: {
        problems: [
          {
            problemId: (page || 0) * 10 + 1,
            title: `${keyword} Result ${(page || 0) * 10 + 1}`,
            tier: 'GOLD_1',
            tags: [],
          },
          {
            problemId: (page || 0) * 10 + 2,
            title: `${keyword} Result ${(page || 0) * 10 + 2}`,
            tier: 'GOLD_1',
            tags: [],
          },
        ],
        workbooks: [],
        users: [],
      },
    } as SearchResponse);
  }),
}));

// TODO: Re-enable when React 19 + Vitest compatibility is resolved
// Issue: "Invalid hook call" error in test environment
describe.skip('useSearch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for testing
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('returns initial loading state', () => {
    const { result } = renderHook(() => useSearch({ keyword: 'test', category: 'PROBLEM' }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('fetches search results successfully', async () => {
    const { result } = renderHook(() => useSearch({ keyword: 'test', category: 'PROBLEM' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0].data.problems).toHaveLength(2);
  });

  it('does not fetch when query is less than minimum length', () => {
    const { result } = renderHook(() => useSearch({ keyword: 'a', category: 'PROBLEM' }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('supports pagination with hasNextPage', async () => {
    const { result } = renderHook(() => useSearch({ keyword: 'test', category: 'PROBLEM' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it('can fetch next page', async () => {
    const { result } = renderHook(() => useSearch({ keyword: 'test', category: 'PROBLEM' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);

    // Fetch next page
    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
    });

    expect(result.current.data?.pages).toHaveLength(2);
    expect(result.current.data?.pages[1].data.problems).toHaveLength(2);
  });

  it('uses correct query key based on query and type', async () => {
    const { result: result1 } = renderHook(
      () => useSearch({ keyword: 'test1', category: 'PROBLEM' }),
      {
        wrapper,
      },
    );
    const { result: result2 } = renderHook(
      () => useSearch({ keyword: 'test2', category: 'USER' }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Both queries should have independent cache entries
    expect(result1.current.data).not.toBe(result2.current.data);
  });

  it('includes totalCount in result', async () => {
    const { result } = renderHook(() => useSearch({ keyword: 'test', category: 'PROBLEM' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages[0].pagination.totalElements).toBe(25);
  });

  it('handles empty results gracefully', async () => {
    const { fetchSearchResults } = await import('@/api/searchApi');
    vi.mocked(fetchSearchResults).mockResolvedValueOnce({
      category: 'PROBLEM',
      counts: null,
      pagination: {
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      },
      data: {
        problems: [],
        workbooks: [],
        users: [],
      },
    });

    const { result } = renderHook(
      () => useSearch({ keyword: 'nonexistent', category: 'PROBLEM' }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages[0].data.problems).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('refetches when query changes', async () => {
    const { result, rerender } = renderHook(
      ({ keyword }: { keyword: string }) => useSearch({ keyword, category: 'PROBLEM' }),
      {
        wrapper,
        initialProps: { keyword: 'test1' },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstData = result.current.data;

    // Change query
    rerender({ keyword: 'test2' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched new data
    expect(result.current.data).not.toBe(firstData);
  });

  it('refetches when type filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ category }: { category: SearchCategory }) => useSearch({ keyword: 'test', category }),
      {
        wrapper,
        initialProps: { category: 'PROBLEM' as SearchCategory },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstData = result.current.data;

    // Change type
    rerender({ category: 'USER' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched new data
    expect(result.current.data).not.toBe(firstData);
  });
});
