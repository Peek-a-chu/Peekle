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
  const res = await apiFetch<SubmissionSuccessUser[]>(
    `/api/submissions/study/${studyId}/problem/${problemId}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch submissions');
  }
  return res.data;
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
  number: number;
  tags?: string[];
}

export async function searchExternalProblems(query: string): Promise<ExternalProblem[]> {
  const res = await apiFetch<ExternalProblem[]>('/api/external/search?query=' + encodeURIComponent(query));
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to search external problems');
  }
  return res.data;
}

export async function deleteProblem(studyId: number, problemId: number): Promise<void> {
  const res = await apiFetch<void>(`/api/studies/${studyId}/problems/${problemId}`, {
    method: 'DELETE',
  });
  if (!res.success) {
    throw new Error(res.error?.message || 'Failed to delete problem');
  }
}
