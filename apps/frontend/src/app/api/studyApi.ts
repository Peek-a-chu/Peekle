import { ChatMessage } from '@/domains/study/types/chat';

export interface Participant {
  id: number;
  odUid: string;
  nickname: string;
  isOwner: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isOnline: boolean;
  lastSpeakingAt?: number;
}

export interface RoomInfo {
  roomId: number;
  roomTitle: string;
  roomDescription: string;
  inviteCode: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchStudyParticipants(studyId: number): Promise<Participant[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/participants`);
  if (!res.ok) {
    throw new Error('Failed to fetch participants');
  }
  return res.json() as Promise<Participant[]>;
}

export async function fetchStudyRoom(studyId: number): Promise<RoomInfo> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch study room info');
  }
  return res.json() as Promise<RoomInfo>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

export async function fetchStudyChats(studyId: number): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE_URL}/api/studies/${studyId}/chats`);
  if (!res.ok) {
    throw new Error('Failed to fetch chat history');
  }

  const json = (await res.json()) as
    | ApiResponse<Page<ChatMessage>>
    | ChatMessage[]
    | Page<ChatMessage>;

  if ('data' in json && json.data && 'content' in json.data) {
    return json.data.content;
  }
  if ('content' in json && Array.isArray(json.content)) {
    return json.content;
  }
  if (Array.isArray(json)) {
    return json;
  }
  return [];
}
