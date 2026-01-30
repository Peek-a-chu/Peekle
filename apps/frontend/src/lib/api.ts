import { ApiResponse } from '@/types/apiUtils';

let BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080';

// 로컬 개발 환경에서 https로 설정된 경우 http로 강제 변환
if (
  BACKEND_URL.startsWith('https://') &&
  (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1'))
) {
  BACKEND_URL = BACKEND_URL.replace('https://', 'http://');
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

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

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;
  const url = `${BACKEND_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as any),
  };

  if (authToken && !skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type') || '';

  if (response.status === 401) {
    // Access token 만료 -> refresh 시도
    const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      // 재시도
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers as any),
        },
      });
      return retryResponse.json() as Promise<ApiResponse<T>>;
    } else {
      // Refresh도 실패 -> 로그인 페이지로
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return {
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Session expired' },
      };
    }
  }

  // Some backends/security setups may redirect to an HTML login page (200 + text/html),
  // which would explode with "Unexpected token '<'" when calling response.json().
  // Detect and surface a clearer error to help debugging.
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
    return {
      success: false,
      data: null,
      error: {
        code: 'INVALID_RESPONSE',
        message: `Expected JSON but got '${contentType || 'unknown'}' (status ${response.status}) from ${url}. Snippet: ${snippet}`,
      },
    };
  }

  return response.json() as Promise<ApiResponse<T>>;
}
