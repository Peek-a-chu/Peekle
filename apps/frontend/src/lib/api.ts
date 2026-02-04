import { ApiResponse } from '@/types/apiUtils';

let BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost';

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

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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

  // Cookie 인증으로 변경되었으므로 Authorization 헤더는 선택적/초기진입용으로만 사용하거나 제거 가능
  // 다만 기존 로직 호환성을 위해 authToken이 명시적으로 있을 때만 넣음
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
    // 이미 갱신 중이라면 그 결과를 기다림
    if (isRefreshing && refreshPromise) {
      const success = await refreshPromise;
      if (success) {
        return retryOriginalRequest(url, fetchOptions);
      } else {
        return handleAuthFailure();
      }
    }

    // 갱신 시작
    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const refreshUrl =
          typeof window !== 'undefined' ? '/api/auth/refresh' : `${BACKEND_URL}/api/auth/refresh`;
        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          credentials: 'include',
        });

        return refreshResponse.ok;
      } catch (e) {
        console.error("Token refresh error:", e);
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    const success = await refreshPromise;
    if (success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:refreshed'));
      }
      return retryOriginalRequest(url, fetchOptions);
    } else {
      return handleAuthFailure();
    }
  }

  // Some backends/security setups may redirect to an HTML login page (200 + text/html),
  // which would explode with "Unexpected token '<'" when calling response.json().
  // Detect and surface a clearer error to help debugging.
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    // const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
    // HTML 응답이 오는 경우(보통 에러페이지나 로그인페이지) 처리
    return {
      success: false,
      data: null,
      error: {
        code: 'INVALID_RESPONSE',
        message: `Expected JSON but got '${contentType || 'unknown'}' (status ${response.status})`,
      },
    };
  }

  const json = await response.json();

  // 1. 이미 ApiResponse 규격인 경우 그대로 반환
  if (json && typeof json === 'object' && 'success' in json) {
    return json as ApiResponse<T>;
  }

  // 2. ApiResponse 규격이 아니지만 응답이 성공(2xx)인 경우 성공으로 래핑
  if (response.ok) {
    return { success: true, data: json, error: undefined } as ApiResponse<T>;
  }

  // 3. 응답이 실패인데 ApiResponse 규격이 아닌 경우(Spring 기본 에러 등) 실패로 래핑
  return {
    success: false,
    data: null,
    error: {
      code: json.code || json.status?.toString() || 'API_ERROR',
      message: json.message || json.error || `Request failed with status ${response.status}`,
    },
  } as ApiResponse<T>;
}

async function retryOriginalRequest<T>(url: string, fetchOptions: RequestInit): Promise<ApiResponse<T>> {
  const retryResponse = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as any),
      // 재시도 시 Auth 헤더는 쿠키가 대신하므로 명시적으로 제거하거나 유지 (상황에 따라)
      // 여기서는 authToken 변수가 업데이트되지 않으므로(쿠키방식) 제거하거나 그대로 둠
      // 쿠키가 우선시되므로 크게 상관 없음
    },
  });

  const retryText = await retryResponse.text();
  if (!retryText) {
    return {
      success: retryResponse.ok,
      data: null as any,
      error: retryResponse.ok ? undefined : { code: 'EMPTY_RESPONSE', message: 'Empty response body' },
    } as ApiResponse<T>;
  }

  try {
    const json = JSON.parse(retryText);
    if (json && typeof json === 'object' && 'success' in json) {
      return json as ApiResponse<T>;
    }
    return { success: true, data: json, error: undefined } as ApiResponse<T>;
  } catch (e: any) {
    return {
      success: false,
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: `Retry failed parse: ${e.message}`,
      },
    };
  }
}

function handleAuthFailure<T>(): ApiResponse<T> {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  return {
    success: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Session expired after refresh attempt' },
  };
}
