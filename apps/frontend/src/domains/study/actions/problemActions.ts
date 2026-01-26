'use server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function addProblemAction(
  studyId: number,
  problemData: { title: string; number: number; tags?: string[] },
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(problemData),
  });

  if (!res.ok) {
    throw new Error('Failed to add problem');
  }

  // If we were using Server Components, we could revalidate here.
  // Since we are using client-side fetching via React Query / useEffect,
  // we might still rely on the client to refetch, but this action
  // provides the server-side mutation capability.
  // revalidatePath(`/study/${studyId}`);
}

export async function deleteProblemAction(studyId: number, problemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/problems/${problemId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete problem');
  }

  // revalidatePath(`/study/${studyId}`);
}
