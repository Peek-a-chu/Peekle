import { apiFetch } from '@/lib/api';
import type { ApiResponse } from '@/types/apiUtils';

export interface StudyMemberResponse {
  userId: number;
  nickname: string;
  profileImg: string;
  profileImgThumb?: string; // Added field
  role: 'OWNER' | 'MEMBER';
  isOnline: boolean;
}

export interface RankResponse {
  rank: number;
  studyId: number;
  name: string;
  totalPoint: number;
  memberCount: number;
  members: StudyMemberResponse[];
}

export interface RankingPageResponse {
  content: RankResponse[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
}

export async function getRankings(
  page = 0,
  size = 10,
  keyword?: string,
  scope: 'ALL' | 'MINE' = 'ALL',
): Promise<RankingPageResponse> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('size', String(size));
  params.append('scope', scope);
  if (keyword && keyword.trim()) {
    params.append('keyword', keyword.trim());
  }

  const res = await apiFetch<RankingPageResponse>(`/api/ranks?${params.toString()}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch rankings');
  }
  return res.data;
}
