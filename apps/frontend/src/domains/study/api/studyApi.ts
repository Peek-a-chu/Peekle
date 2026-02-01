import { ChatMessageResponse, StudyRoomDetail, StudyMember } from '@/domains/study/types';
import { apiFetch } from '@/lib/api';

// Re-export specific types if needed by legacy code, or alias them
export interface Participant extends StudyMember {
  // Extending StudyMember to keep compatibility with UI components that might expect these
  // Default values will be used if API doesn't provide them
  isOwner?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isOnline?: boolean;
}

export type RoomInfo = StudyRoomDetail;

// 1. Study Detail (Get Members from here)
export async function fetchStudyParticipants(studyId: number): Promise<any[]> {
  // Spec: GET /api/studies/{id} returns members list inside
  const room = await fetchStudyRoom(studyId);
  const roomData = room as any;
  const ownerId = roomData.owner?.id;

  return roomData.members.map((m: any) => ({
    ...m,
    id: m.userId, // Map userId to id for Store
    odUid: m.odUid, // Real OpenVidu UID from server
    // Use role from JSON or fallback to ownerId check
    isOwner: m.role === 'OWNER' || (ownerId && m.userId === ownerId),
    isMuted: false,
    isVideoOff: false,
    isOnline: m.isOnline, // Use real online status
  }));
}

export async function fetchStudyRoom(
  studyId: number,
): Promise<RoomInfo & { owner?: { id: number } }> {
  const res = await apiFetch<StudyRoomDetail & { owner?: { id: number } }>(
    `/api/studies/${studyId}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch study room');
  }
  return res.data;
}

// 2. Chat History
export async function fetchStudyChats(studyId: number): Promise<ChatMessageResponse[]> {
  const res = await apiFetch<{ content: ChatMessageResponse[] }>(`/api/studies/${studyId}/chats`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch chats');
  }
  // Spec: Response is { "content": [ ... ] }
  return res.data.content || [];
}

// 3. Study List (My Studies)
import type { StudyListResponse, StudyListContent } from '@/domains/study/types';

export async function fetchMyStudies(page = 0, keyword = ''): Promise<StudyListResponse> {
  // Backend expects /api/studies (not /api/studies/my)
  // Build query string, only include non-empty parameters
  const params = new URLSearchParams();
  if (page > 0) {
    params.append('page', String(page));
  }
  if (keyword.trim()) {
    params.append('keyword', keyword.trim());
  }
  const queryString = params.toString();
  const url = `/api/studies${queryString ? `?${queryString}` : ''}`;

  const res = await apiFetch<StudyListResponse>(url);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to fetch my studies');
  }

  // 디버깅: API 응답 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('[fetchMyStudies] API Response:', JSON.stringify(res.data, null, 2));
  }

  return res.data;
}

// 4. Create Study
export async function createStudy(
  title: string,
  description?: string,
): Promise<{ inviteCode: string }> {
  const res = await apiFetch<{ inviteCode: string }>(`/api/studies`, {
    method: 'POST',
    body: JSON.stringify({ title, description: description || '' }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to create study');
  }
  return res.data;
}

// 5. Join Study
export async function joinStudy(
  inviteCode: string,
): Promise<StudyRoomDetail & { ownerId?: number }> {
  const res = await apiFetch<StudyRoomDetail & { ownerId?: number }>(`/api/studies/join`, {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to join study');
  }
  return res.data;
}

// 6. Generate Invite Code
export async function generateInviteCode(studyId: number): Promise<{ inviteCode: string }> {
  const res = await apiFetch<{ inviteCode: string }>(`/api/studies/${studyId}/invite`, {
    method: 'POST',
  });
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Failed to generate invite code');
  }
  return res.data;
}
