import { Problem, Submission } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchSubmissions(studyId: number, problemId: number): Promise<Submission[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems/${problemId}/submissions`);
  if (!res.ok) {
    throw new Error('Failed to fetch submissions');
  }
  return res.json();
}

export async function fetchProblems(studyId: number, date: string): Promise<Problem[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems?date=${date}`);
  if (!res.ok) {
    throw new Error('Failed to fetch problems');
  }
  return res.json();
}

export async function fetchProblemDates(studyId: number): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems/dates`);
  if (!res.ok) {
    throw new Error('Failed to fetch problem dates');
  }
  return res.json();
}
