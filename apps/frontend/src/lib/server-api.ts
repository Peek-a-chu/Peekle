import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

export async function serverFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: string; status: number }> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');

  const url = `${BACKEND_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        ...options.headers,
      },
      // 서버 간 통신이므로 credentials 옵션은 필요 없음 (헤더에 직접 넣었음)
    });

    if (!res.ok) {
      // 에러 응답도 JSON일 수 있으므로 시도
      try {
        const errorData = await res.json();
        return { success: false, error: JSON.stringify(errorData), status: res.status };
      } catch {
        return { success: false, error: res.statusText, status: res.status };
      }
    }

    // 204 No Content 등 body가 없는 경우 처리
    if (res.status === 204) {
      return { success: true, status: res.status };
    }

    const json = await res.json();

    // Backend ApiResponse unpacking (like api.ts)
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return { success: true, data: json.data as T, status: res.status };
    }

    return { success: true, data: json as T, status: res.status };
  } catch (error) {
    console.error(`ServerFetch Error [${path}]:`, error);
    return { success: false, error: 'Internal Server Error', status: 500 };
  }
}
