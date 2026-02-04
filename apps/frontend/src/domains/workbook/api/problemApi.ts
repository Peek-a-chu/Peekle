import { apiFetch } from '@/lib/api';

export interface BojProblemResponse {
  id: number;
  externalId: string;
  title: string;
  tier: string;
  url: string;
}

export async function searchBojProblems(
  keyword: string,
  limit: number = 10,
): Promise<BojProblemResponse[]> {
  if (!keyword.trim()) return [];

  const response = await apiFetch<BojProblemResponse[]>(
    `/api/problems/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to search problems');
  }

  return response.data;
}

export async function getProblemIdByExternalId(
  externalId: string,
  source: string = 'BOJ',
): Promise<number> {
  const response = await apiFetch<{ problemId: number }>(
    `/api/problems/by-external-id?externalId=${externalId}&source=${source}`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get problem ID');
  }

  return response.data.problemId;
}
