import type { SearchCategory } from '@/api/searchApi';

export const MIN_SEARCH_LENGTH = 1;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_STALE_TIME_MS = 5 * 60 * 1000;
export const SEARCH_SUGGESTION_SIZE = 4;

export function normalizeSearchKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ');
}

export function normalizeSearchList(values?: string[]): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)),
  ).sort();
}

interface SearchQueryKeyParams {
  keyword: string;
  category?: SearchCategory;
  size?: number;
  tiers?: string[];
  tags?: string[];
}

export const searchQueryKeys = {
  all: ['search'] as const,
  results: ({ keyword, category = 'ALL', size, tiers, tags }: SearchQueryKeyParams) =>
    [
      ...searchQueryKeys.all,
      'results',
      normalizeSearchKeyword(keyword),
      category,
      size ?? null,
      normalizeSearchList(tiers),
      normalizeSearchList(tags),
    ] as const,
  suggestions: ({ keyword, category = 'ALL', size, tiers, tags }: SearchQueryKeyParams) =>
    [
      ...searchQueryKeys.all,
      'suggestions',
      normalizeSearchKeyword(keyword),
      category,
      size ?? SEARCH_SUGGESTION_SIZE,
      normalizeSearchList(tiers),
      normalizeSearchList(tags),
    ] as const,
};

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}
