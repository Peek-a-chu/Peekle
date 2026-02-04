import { apiFetch } from '@/lib/api';

// Response Types
export interface WorkbookCreator {
  id: number;
  nickname: string;
}

export interface WorkbookProblemResponse {
  id: number;
  number: number;
  title: string;
  tier: string;
  url: string;
  solved: boolean;
}

export interface WorkbookResponse {
  id: number;
  title: string;
  description: string;
  problemCount: number;
  bookmarkCount: number;
  isBookmarked: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  creator: WorkbookCreator;
  problems?: WorkbookProblemResponse[];
}

export interface WorkbookListResponse {
  id: number;
  title: string;
  description: string;
  problemCount: number;
  solvedCount: number;
  bookmarkCount: number;
  isBookmarked: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  creator: WorkbookCreator;
}

export interface WorkbookCountResponse {
  all: number;
  my: number;
  bookmarked: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Request Types
export interface WorkbookCreateRequest {
  title: string;
  description: string;
  problemIds: number[];
}

export interface WorkbookUpdateRequest {
  title: string;
  description: string;
  problemIds: number[];
}

// API Functions

// 문제집 생성
export async function createWorkbook(request: WorkbookCreateRequest): Promise<WorkbookResponse> {
  console.log('[createWorkbook] Request:', request);

  const response = await apiFetch<WorkbookResponse>('/api/workbooks/new', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  console.log('[createWorkbook] Response:', response);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to create workbook');
  }

  return response.data;
}

// 문제집 목록 조회
export async function getWorkbooks(
  tab: string = 'ALL',
  keyword?: string,
  sort: string = 'LATEST',
  page: number = 0,
  size: number = 15,
): Promise<PageResponse<WorkbookListResponse>> {
  const params = new URLSearchParams({
    tab,
    sort,
    page: String(page),
    size: String(size),
  });

  if (keyword) {
    params.append('keyword', keyword);
  }

  const response = await apiFetch<PageResponse<WorkbookListResponse>>(`/api/workbooks?${params}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch workbooks');
  }

  return response.data;
}

// 탭별 개수 조회
export async function getWorkbookCounts(): Promise<WorkbookCountResponse> {
  const response = await apiFetch<WorkbookCountResponse>('/api/workbooks/counts');

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch workbook counts');
  }

  return response.data;
}

// 문제집 상세 조회
export async function getWorkbook(workbookId: number): Promise<WorkbookResponse> {
  const response = await apiFetch<WorkbookResponse>(`/api/workbooks/${workbookId}`);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch workbook');
  }

  return response.data;
}

// 문제집 수정
export async function updateWorkbook(
  workbookId: number,
  request: WorkbookUpdateRequest,
): Promise<WorkbookResponse> {
  const response = await apiFetch<WorkbookResponse>(`/api/workbooks/${workbookId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to update workbook');
  }

  return response.data;
}

// 문제집 삭제
export async function deleteWorkbook(workbookId: number): Promise<void> {
  const response = await apiFetch<void>(`/api/workbooks/${workbookId}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete workbook');
  }
}

// 문제집에 문제 추가
export async function addProblemToWorkbook(
  workbookId: number,
  problemId: number,
): Promise<void> {
  const response = await apiFetch<void>(`/api/workbooks/${workbookId}/problems/${problemId}`, {
    method: 'POST',
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to add problem to workbook');
  }
}

// 북마크 토글
export async function toggleWorkbookBookmark(
  workbookId: number,
): Promise<{ isBookmarked: boolean }> {
  const response = await apiFetch<{ isBookmarked: boolean }>(
    `/api/workbooks/${workbookId}/bookmark`,
    {
      method: 'POST',
    },
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to toggle bookmark');
  }

  return response.data;
}
