import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch } from '@/hooks/useSearch';
import * as React from 'react';

// Mock the search API
vi.mock('@/api/searchApi', () => ({
  fetchSearchResults: vi.fn(({ query, type, page }) => {
    return Promise.resolve({
      results: [
        { id: page * 10 + 1, title: `${query} Result ${page * 10 + 1}`, type },
        { id: page * 10 + 2, title: `${query} Result ${page * 10 + 2}`, type },
      ],
      hasNextPage: page < 2,
      nextPage: page < 2 ? page + 1 : undefined,
      totalCount: 25,
    });
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
    const { result } = renderHook(() => useSearch('test', 'PROBLEM'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('fetches search results successfully', async () => {
    const { result } = renderHook(() => useSearch('test', 'PROBLEM'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0].data.data.problems).toHaveLength(2);
  });

  it('does not fetch when query is less than minimum length', () => {
    const { result } = renderHook(() => useSearch('a', 'PROBLEM'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('supports pagination with hasNextPage', async () => {
    const { result } = renderHook(() => useSearch('test', 'PROBLEM'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);
  });

  it('can fetch next page', async () => {
    const { result } = renderHook(() => useSearch('test', 'PROBLEM'), { wrapper });

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
    expect(result.current.data?.pages[1].data.data.problems).toHaveLength(2);
  });

  it('uses correct query key based on query and type', async () => {
    const { result: result1 } = renderHook(() => useSearch('test1', 'PROBLEM'), {
      wrapper,
    });
    const { result: result2 } = renderHook(() => useSearch('test2', 'USER'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Both queries should have independent cache entries
    expect(result1.current.data).not.toBe(result2.current.data);
  });

  it('includes totalCount in result', async () => {
    const { result } = renderHook(() => useSearch('test', 'PROBLEM'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages[0].data.pagination.totalElements).toBe(25);
  });

  it('handles empty results gracefully', async () => {
    const { fetchSearchResults } = await import('@/api/searchApi');
    vi.mocked(fetchSearchResults).mockResolvedValueOnce({
      success: true,
      data: {
        counts: null,
        data: {
          problems: [],
          workbooks: [],
          users: [],
        },
        pagination: {
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useSearch('nonexistent', 'PROBLEM'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.pages[0].data.data.problems).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('refetches when query changes', async () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useSearch(query, 'PROBLEM'),
      {
        wrapper,
        initialProps: { query: 'test1' },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstData = result.current.data;

    // Change query
    rerender({ query: 'test2' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched new data
    expect(result.current.data).not.toBe(firstData);
  });

  it('refetches when type filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ type }: { type: 'PROBLEM' | 'USER' | 'WORKBOOK' }) => useSearch('test', type),
      {
        wrapper,
        initialProps: { type: 'PROBLEM' as const },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstData = result.current.data;

    // Change type
    rerender({ type: 'USER' as const });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched new data
    expect(result.current.data).not.toBe(firstData);
  });
});
