'use server';

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

// 로컬 개발 환경에서 https로 설정된 경우 http로 강제 변환
if (
  API_BASE_URL.startsWith('https://') &&
  (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1'))
) {
  API_BASE_URL = API_BASE_URL.replace('https://', 'http://');
}

export async function addProblemAction(
  studyId: number,
  problemData: { title: string; number: number; tags?: string[] },
): Promise<void> {
  const url = `${API_BASE_URL}/api/studies/${studyId}/problems`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(problemData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[addProblemAction] Error ${res.status}: ${errorText}`);
      throw new Error(`Failed to add problem: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error(`[addProblemAction] Network error calling ${url}:`, error);
    throw error;
  }

  // If we were using Server Components, we could revalidate here.
  // Since we are using client-side fetching via React Query / useEffect,
  // we might still rely on the client to refetch, but this action
  // provides the server-side mutation capability.
  // revalidatePath(`/study/${studyId}`);
}

export async function deleteProblemAction(studyId: number, problemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/problems/${problemId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete problem');
  }

  // revalidatePath(`/study/${studyId}`);
}
