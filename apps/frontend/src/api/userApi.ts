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

export async function checkNickname(nickname: string): Promise<ApiResponse<CheckNicknameResponse>> {
  return await apiFetch<CheckNicknameResponse>(
    `/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`,
  );
}

export interface CheckBojIdResponse {
  valid: boolean;
  message: string;
}

export async function checkBojId(bojId: string): Promise<ApiResponse<CheckBojIdResponse>> {
  return await apiFetch<CheckBojIdResponse>(
    `/api/users/check-boj-id?bojId=${encodeURIComponent(bojId)}`,
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

// Server-side exports
