import { apiFetch } from '@/lib/api';

export type SearchCategory = 'ALL' | 'PROBLEM' | 'WORKBOOK' | 'USER';

export interface Problem {
  problemId: number;
  title: string;
  tier: string;
  tags: string[];
  externalId: string;
}

export interface Workbook {
  workbookId: number;
  title: string;
  description: string;
  tags: string[];
  problemCount?: number;
}

export interface User {
  userId: number;
  handle: string;
  tier: string;
  profileImage?: string;
  league: string;
  score: number;
}

export interface SearchData {
  problems: Problem[];
  workbooks: Workbook[];
  users: User[];
}

export interface Pagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type SearchResultItem = Problem | Workbook | User;

export interface SearchResponse {
  category: SearchCategory;
  counts: null;
  data: SearchData;
  pagination: Pagination;
}

export interface SearchParams {
  keyword: string;
  category?: SearchCategory;
  page?: number;
  size?: number;
  tiers?: string[];
  tags?: string[];
}

/**
 * Fetch search results with pagination via Unified Search API
 * @param params - Search parameters
 * @returns Search results
 */
export async function fetchSearchResults(params: SearchParams): Promise<SearchResponse> {
  const { keyword, category = 'ALL', size = 20, page = 0, tiers, tags } = params;

  const urlParams = new URLSearchParams();
  urlParams.append('keyword', keyword);
  if (category) urlParams.append('category', category);
  urlParams.append('page', page.toString());
  urlParams.append('size', size.toString());

  if (tiers && tiers.length > 0) {
    tiers.forEach((t) => urlParams.append('tiers', t));
  }
  if (tags && tags.length > 0) {
    tags.forEach((t) => urlParams.append('tags', t));
  }

  const queryString = urlParams.toString();
  console.log('Fetching search results:', `/api/search?${queryString}`);

  const res = await apiFetch<any>(`/api/search?${queryString}`);

  if (!res.success || !res.data) {
    console.error('Search API error:', res);
    throw new Error(res.error?.message || 'Search failed');
  }

  // Map backend response to frontend interface
  const searchResult = res.data;
  const innerData = searchResult.data || {};

  const rawUsers = innerData.users || [];

  const mappedUsers = rawUsers.map((user: any) => ({
    userId: user.userId,
    handle: user.nickname || user.handle, // Map nickname to handle
    tier: user.tier,
    profileImage: user.profileImg || user.profileImage, // Map profileImg to profileImage
    league: user.league || user.tier || 'Unranked', // Use tier as league if league is missing
    score: user.score || 0, // Default value
  }));

  const mappedData: SearchData = {
    problems: innerData.problems || [],
    workbooks: innerData.workbooks || [],
    users: mappedUsers,
  };

  return {
    ...searchResult,
    data: mappedData,
  };
}
