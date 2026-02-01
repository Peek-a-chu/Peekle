import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchCategory, SearchResponse } from '@/api/searchApi';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  setAuthToken: vi.fn(),
}));

describe('useSearch - Hook Structure', () => {
  it('hook exists and is importable', async () => {
    const module = await import('@/hooks/useSearch');
    expect(module.useSearch).toBeDefined();
    expect(typeof module.useSearch).toBe('function');
  });

  it('hook implementation includes required query options', async () => {
    const module = await import('@/hooks/useSearch');
    const hookSource = module.useSearch.toString();

    // Verify hook uses useInfiniteQuery
    expect(hookSource).toContain('useInfiniteQuery');

    // Verify query key includes keyword and category
    expect(hookSource).toMatch(/keyword/);
    expect(hookSource).toMatch(/category/);

    // Verify staleTime configuration
    expect(hookSource).toMatch(/staleTime/);

    // Verify enabled condition for minimum search length
    expect(hookSource).toMatch(/min_search_length/i);
  });
});

describe('searchApi - API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResponse: SearchResponse = {
    data: {
      category: 'ALL',
      counts: null,
      data: {
        problems: [
          {
            problemId: 1,
            title: 'Test Problem',
            tier: 'GOLD_1',
            tags: ['dp'],
          },
        ],
        workbooks: [],
        users: [],
      },
      pagination: {
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    },
  };

  it('fetchSearchResults is defined and callable', async () => {
    const { fetchSearchResults } = await import('@/api/searchApi');
    expect(fetchSearchResults).toBeDefined();
    expect(typeof fetchSearchResults).toBe('function');
  });

  it('fetchSearchResults returns expected structure', async () => {
    const { apiFetch } = await import('@/lib/api');
    // @ts-ignore
    apiFetch.mockResolvedValue({ success: true, data: mockResponse.data });

    const { fetchSearchResults } = await import('@/api/searchApi');

    const result = await fetchSearchResults({
      keyword: 'test',
      category: 'ALL',
      page: 0,
      size: 10,
    });

    expect(result).toHaveProperty('data');
    expect(result.pagination).toBeDefined();
    expect(result.data.problems).toHaveLength(1);
    expect(result.data.problems[0].title).toBe('Test Problem');
  });

  it('fetchSearchResults passes correct params to api', async () => {
    const { apiFetch } = await import('@/lib/api');
    // @ts-ignore
    apiFetch.mockResolvedValue({ success: true, data: mockResponse.data });

    const { fetchSearchResults } = await import('@/api/searchApi');

    await fetchSearchResults({
      keyword: 'testParams',
      category: 'PROBLEM',
      page: 1,
      size: 5,
    });

    // Verify URL parameters
    const expectedUrlPart = '/api/search?';
    // @ts-ignore
    const callArg = apiFetch.mock.calls[0][0];
    expect(callArg).toContain(expectedUrlPart);
    expect(callArg).toContain('keyword=testParams');
    expect(callArg).toContain('category=PROBLEM');
    expect(callArg).toContain('page=1');
    expect(callArg).toContain('size=5');
  });

  it('fetchSearchResults respects category parameter', async () => {
    const { apiFetch } = await import('@/lib/api');
    // @ts-ignore
    apiFetch.mockResolvedValue({ success: true, data: mockResponse.data });

    const { fetchSearchResults } = await import('@/api/searchApi');

    await fetchSearchResults({
      keyword: 'test',
      category: 'WORKBOOK',
      page: 0,
    });

    // @ts-ignore
    const callArg = apiFetch.mock.calls[0][0];
    expect(callArg).toContain('category=WORKBOOK');
  });
});
