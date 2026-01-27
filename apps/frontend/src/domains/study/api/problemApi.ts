import { DailyProblem, Submission } from '../types';
import { handleResponse } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchSubmissions(studyId: number, problemId: number): Promise<Submission[]> {
  const res = await fetch(`${API_BASE_URL}/api/submissions/study/${studyId}/problem/${problemId}`);
  return handleResponse<Submission[]>(res);
}

export async function fetchProblems(studyId: number, date: string): Promise<DailyProblem[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/curriculum/daily?date=${date}`);
  return handleResponse<DailyProblem[]>(res);
}

export async function fetchProblemDates(studyId: number): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/curriculum/dates`);
  return handleResponse<string[]>(res);
}
