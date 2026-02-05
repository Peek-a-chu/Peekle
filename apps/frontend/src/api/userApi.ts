import { apiFetch } from '@/lib/api';
import { ApiResponse } from '@/types/apiUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface CheckNicknameResponse {
  available: boolean;
  message: string;
}

export interface UserInfo {
  id: number;
  nickname: string;
  bojId?: string;
}

export async function checkNickname(
  nickname: string,
  token?: string,
): Promise<ApiResponse<CheckNicknameResponse>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return await apiFetch<CheckNicknameResponse>(
    `/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`,
    { headers },
  );
}

export interface CheckBojIdResponse {
  valid: boolean;
  message: string;
}

export async function checkBojId(
  bojId: string,
  token?: string,
): Promise<ApiResponse<CheckBojIdResponse>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return await apiFetch<CheckBojIdResponse>(
    `/api/users/check-boj-id?bojId=${encodeURIComponent(bojId)}`,
    { headers },
  );
}

export async function getPresignedUrl(
  fileName: string,
  contentType: string,
): Promise<ApiResponse<{ presignedUrl: string; publicUrl: string }>> {
  return await apiFetch<{ presignedUrl: string; publicUrl: string }>(
    `/api/users/me/profile-image/presigned-url`,
    {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    },
  );
}

export async function updateUserProfile(data: any): Promise<ApiResponse<void>> {
  return await apiFetch<void>(`/api/users/me`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<ApiResponse<UserInfo>> {
  return await apiFetch<UserInfo>(`/api/users/me`);
}

export interface UserProfileClient {
  id: number;
  nickname: string;
  bojId: string | null;
  leagueName: string;
  score: number;
  streakCurrent: number;
  streakMax: number;
  profileImage: string | null;
  solvedCount: number;
  me: boolean;
}

export async function getUserProfile(nickname: string): Promise<ApiResponse<UserProfileClient>> {
  return await apiFetch<UserProfileClient>(`/api/users/${encodeURIComponent(nickname)}/profile`);
}

// Server-side exports
