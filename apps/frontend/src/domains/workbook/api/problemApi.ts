const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

  const res = await fetch(
    `${API_BASE_URL}/api/problems/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
  );

  if (!res.ok) {
    throw new Error('Failed to search problems');
  }

  return res.json();
}
