const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface CheckNicknameResponse {
  available: boolean;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function checkNickname(nickname: string): Promise<ApiResponse<CheckNicknameResponse>> {
  const res = await fetch(
    `/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`,
  );
  return res.json() as Promise<ApiResponse<CheckNicknameResponse>>;
}

export interface UserInfo {
  id: number;
  nickname: string;
  bojId?: string;
}

export async function getMe(): Promise<ApiResponse<UserInfo>> {
  const res = await fetch(`/api/users/me`);
  return res.json() as Promise<ApiResponse<UserInfo>>;
}
