import { Problem, Submission } from '@/domains/study/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchSubmissions(studyId: number, problemId: number): Promise<Submission[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems/${problemId}/submissions`);
  if (!res.ok) {
    throw new Error('Failed to fetch submissions');
  }
  return res.json() as Promise<Submission[]>;
}

export async function fetchProblems(studyId: number, date: string): Promise<Problem[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems?date=${date}`);
  if (!res.ok) {
    throw new Error('Failed to fetch problems');
  }
  return res.json() as Promise<Problem[]>;
}

export interface ExternalProblem {
  title: string;
  number: number;
  tags?: string[];
}

export async function searchExternalProblems(query: string): Promise<ExternalProblem[]> {
  const res = await fetch(`${API_BASE_URL}/api/external/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Failed to search problems');
  }
  return res.json() as Promise<ExternalProblem[]>;
}

export async function deleteProblem(studyId: number, problemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems/${problemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete problem');
  }
}
