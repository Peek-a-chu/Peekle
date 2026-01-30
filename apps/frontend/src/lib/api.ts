import { ApiResponse } from '@/types/apiUtils';

let BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

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

/*
   사용자가 로그인을 유지하려면 모든 API 요청이 이 apiFetch를 통과해야합니다.
   그래야 Access Token이 만료되어도, /refresh로 토큰을 갱신하거든요!

 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { skipAuth, ...fetchOptions } = options;

  // 브라우저에서 호출 시 Next.js API route 사용 (상대 경로)
  // 서버 사이드에서 호출 시 백엔드 URL 직접 사용
  const url = typeof window !== 'undefined' ? path : `${BACKEND_URL}${path}`;

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
    const refreshUrl = typeof window !== 'undefined' ? '/api/auth/refresh' : `${BACKEND_URL}/api/auth/refresh`;
    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      // 1. Refresh 성공 시, 새로운 AccessToken 추출 및 저장
      try {
        const refreshJson = await refreshResponse.json();
        if (
          refreshJson &&
          refreshJson.success &&
          refreshJson.data &&
          refreshJson.data.accessToken
        ) {
          setAuthToken(refreshJson.data.accessToken);
        }
      } catch (e) {
        console.error('Failed to parse refresh response', e);
      }

      // 재시도
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers as any),
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
      });

      const retryText = await retryResponse.text();
      if (!retryText) {
        // Body is empty (e.g. 204 No Content), return generic success if status is OK
        return {
          success: retryResponse.ok,
          data: null as any,
          error: retryResponse.ok
            ? undefined
            : { code: 'EMPTY_RESPONSE', message: 'Empty response body' },
        } as ApiResponse<T>;
      }

      try {
        const json = JSON.parse(retryText);
        // If it's the expected structure
        if (json && typeof json === 'object' && 'success' in json) {
          return json as ApiResponse<T>;
        }
        // If it's raw data
        return { success: true, data: json, error: undefined } as ApiResponse<T>;
      } catch (e: any) {
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_JSON',
            message: `Failed to parse retry response: ${e.message}. Status: ${retryResponse.status}`,
          },
        };
      }
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
