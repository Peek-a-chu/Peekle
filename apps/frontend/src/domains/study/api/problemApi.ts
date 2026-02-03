import {
  DailyProblem,
  Submission,
  SubmissionResult,
  SubmissionSuccessUser,
} from '@/domains/study/types';
import { apiFetch } from '@/lib/api';

// 1. Successful Users list
export async function fetchSubmissions(
  studyId: number,
  problemId: number,
): Promise<SubmissionSuccessUser[]> {
  const res = await apiFetch<any>(`/api/submissions/studies/${studyId}/problems/${problemId}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch submissions');
  }
  // Backend returns Page<SubmissionLogResponse>, so we extract content
  if (res.data.content && Array.isArray(res.data.content)) {
    return res.data.content;
  }
  // Fallback if it returns list directly
  if (Array.isArray(res.data)) {
    return res.data;
  }
  // If neither, return empty array to avoid crashes
  return [];
}

// 2. Daily Problems
export async function fetchProblems(studyId: number, date: string): Promise<DailyProblem[]> {
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const res = await apiFetch<DailyProblem[]>(
    `/api/studies/${studyId}/curriculum/daily?date=${date}&_t=${timestamp}`,
    {
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
      },
    },
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch problems');
  }
  return res.data;
}

// 3. Submit Solution
export async function submitProblem(
  studyId: number,
  problemId: number,
  code: string,
): Promise<SubmissionResult> {
  const res = await apiFetch<SubmissionResult>(`/api/studies/${studyId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ problemId, code }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to submit problem');
  }
  return res.data;
}

// 4. Submission Detail
export async function fetchSubmissionDetail(
  submissionId: number,
): Promise<{ submissionId: number; code: string; language: string }> {
  const res = await apiFetch<{ submissionId: number; code: string; language: string }>(
    `/api/submissions/${submissionId}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch submission detail');
  }
  return res.data;
}

export interface ExternalProblem {
  title: string;
  number: number; // externalId를 number로 표시
  externalId?: string;
  problemId?: number; // DB의 problemId
  tier?: string;
  url?: string;
  tags?: string[];
}

export async function searchExternalProblems(query: string): Promise<ExternalProblem[]> {
  const res = await apiFetch<any>(
    '/api/problems/search?keyword=' + encodeURIComponent(query) + '&limit=20',
  );

  let data: any;

  // [Bugfix] Handle both wrapped (ApiResponse) and unwrapped (Raw JSON) responses.
  // apiFetch types says it returns ApiResponse, but if backend returns raw list, we get raw list.
  if (res && typeof res === 'object' && 'success' in res && typeof res.success === 'boolean') {
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to search external problems');
    }
    data = res.data;
  } else {
    // Treat as raw data
    data = res;
  }

  const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];

  // 백엔드 응답을 ExternalProblem 형식으로 변환
  return list.map((item: any) => ({
    title: item.title,
    number: item.externalId ? parseInt(String(item.externalId), 10) : (item.number ?? 0),
    externalId: String(item.externalId || item.number),
    problemId: item.id || item.problemId,
    tier: item.tier,
    url: item.url,
    tags: item.tags || [],
  }));
}

/**
 * externalId로 problemId 조회
 */
export async function getProblemIdByExternalId(
  externalId: string,
  source: string = 'BOJ',
): Promise<number> {
  const res = await apiFetch<{ problemId: number }>(
    `/api/problems/by-external-id?externalId=${encodeURIComponent(externalId)}&source=${encodeURIComponent(source)}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to get problem ID');
  }
  return res.data.problemId;
}

// deleteProblem was deprecated and removed in favor of WebSocket action
