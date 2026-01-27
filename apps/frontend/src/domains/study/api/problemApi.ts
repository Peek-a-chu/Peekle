import { Problem, Submission } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchSubmissions(studyId: number, problemId: number): Promise<Submission[]> {
  const res = await fetch(`${API_BASE_URL}/api/submissions/study/${studyId}/problem/${problemId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch submissions');
  }
  return res.json() as Promise<Submission[]>;
}

export async function fetchProblems(studyId: number, date: string): Promise<Problem[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/curriculum/daily?date=${date}`);
  if (!res.ok) {
    throw new Error('Failed to fetch problems');
  }
  return res.json() as Promise<Problem[]>;
}

export async function fetchProblemDates(studyId: number): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/curriculum/dates`);
  if (!res.ok) {
    throw new Error('Failed to fetch problem dates');
  }
  return res.json() as Promise<string[]>;
}
