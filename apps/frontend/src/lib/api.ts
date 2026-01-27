const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

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
