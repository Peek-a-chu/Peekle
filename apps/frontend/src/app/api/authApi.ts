const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function signup(
  token: string,
  nickname: string,
  bojId?: string | null,
): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      nickname: nickname.trim(),
      bojId: bojId?.trim() || null,
    }),
  });
  return res.json() as Promise<ApiResponse<null>>;
}

export async function logout(): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json() as Promise<ApiResponse<null>>;
}

export async function refresh(): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json() as Promise<ApiResponse<null>>;
}

export function getOAuthLoginUrl(provider: 'kakao' | 'naver' | 'google'): string {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
}
