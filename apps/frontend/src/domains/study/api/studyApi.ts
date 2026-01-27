import { ChatMessageResponse, StudyRoomDetail, StudyMember } from '@/domains/study/types';
import { handleResponse } from '@/lib/api';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// 1. Study Detail (Get Members from here)
export async function fetchStudyParticipants(studyId: number): Promise<any[]> {
  // Spec: GET /api/studies/{id} returns members list inside
  const room = await fetchStudyRoom(studyId);
  return room.members.map((m) => ({
    ...m,
    id: m.userId, // Map userId to id for Store
    odUid: String(m.userId), // Mock OpenVidu UID
    isOwner: false, // Not provided in spec
    isMuted: false,
    isVideoOff: false,
    isOnline: true,
  }));
}

export async function fetchStudyRoom(studyId: number): Promise<RoomInfo> {
  const res = await fetch(`/api/studies/${studyId}`);
  return handleResponse<StudyRoomDetail>(res);
}

// 2. Chat History
export async function fetchStudyChats(studyId: number): Promise<ChatMessageResponse[]> {
  const res = await fetch(`/api/studies/${studyId}/chats`);
  // Spec: Response is { "content": [ ... ] }
  const data = await handleResponse<{ content: ChatMessageResponse[] }>(res);
  return data.content || [];
}

// 3. Study List (My Studies)
export async function fetchMyStudies(
  page = 0,
  keyword = '',
): Promise<{ content: any[]; totalPages: number }> {
  const res = await fetch(`/api/studies/my?page=${page}&keyword=${encodeURIComponent(keyword)}`);
  return handleResponse<{ content: any[]; totalPages: number }>(res);
}

// 4. Create Study
export async function createStudy(title: string): Promise<{ inviteCode: string }> {
  const res = await fetch(`/api/studies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return handleResponse<{ inviteCode: string }>(res);
}

// 5. Join Study
export async function joinStudy(
  inviteCode: string,
): Promise<StudyRoomDetail & { ownerId?: number }> {
  const res = await fetch(`/api/studies/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  });
  return handleResponse<StudyRoomDetail & { ownerId?: number }>(res);
}

// 6. Generate Invite Code
export async function generateInviteCode(studyId: number): Promise<{ inviteCode: string }> {
  const res = await fetch(`/api/studies/${studyId}/invite`, {
    method: 'POST',
  });
  return handleResponse<{ inviteCode: string }>(res);
}
