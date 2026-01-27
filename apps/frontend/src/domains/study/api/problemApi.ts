import { DailyProblem, Submission, SubmissionResult, SubmissionSuccessUser } from '../types';
import { handleResponse } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 1. Successful Users list
export async function fetchSubmissions(studyId: number, problemId: number): Promise<SubmissionSuccessUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/submissions/study/${studyId}/problem/${problemId}`);
  return handleResponse<SubmissionSuccessUser[]>(res);
}

// 2. Daily Problems
export async function fetchProblems(studyId: number, date: string): Promise<DailyProblem[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/curriculum/daily?date=${date}`);
  return handleResponse<DailyProblem[]>(res);
}

// 3. Submit Solution
export async function submitProblem(studyId: number, problemId: number, code: string): Promise<SubmissionResult> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemId, code }),
  });
  return handleResponse<SubmissionResult>(res);
}

// 4. Submission Detail
export async function fetchSubmissionDetail(submissionId: number): Promise<{ submissionId: number; code: string; language: string }> {
  const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`);
  return handleResponse<{ submissionId: number; code: string; language: string }>(res);
}

export interface ExternalProblem {
  title: string;
  number: number;
  tags?: string[];
}

export async function searchExternalProblems(query: string): Promise<ExternalProblem[]> {
  const res = await fetch(`${API_BASE_URL}/api/external/search?query=${encodeURIComponent(query)}`);
  return handleResponse<ExternalProblem[]>(res);
}

export async function deleteProblem(studyId: number, problemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/problems/${problemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete problem: ${res.statusText}`);
  }
}
