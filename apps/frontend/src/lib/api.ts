import { ApiResponse } from '@/types/apiUtils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API call failed: ${res.statusText}`);
  }
  const json = await res.json();
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/*
   사용자가 로그인을 유지하려면 모든 API 요청이 이 apiFetch를 통과해야합니다.
   그래야 Access Token이 만료되어도, /refresh로 토큰을 갱신하거든요!

 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${BACKEND_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Access token 만료 -> refresh 시도
    const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      // 재시도
      const retryResponse = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return retryResponse.json() as Promise<ApiResponse<T>>;
    } else {
      // Refresh도 실패 -> 로그인 페이지로
      window.location.href = '/login';
      return {
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Session expired' },
      };
    }
  }

  return response.json() as Promise<ApiResponse<T>>;
}
